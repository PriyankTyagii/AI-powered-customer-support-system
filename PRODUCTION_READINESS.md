# Production Readiness Review & Plan

_Review date: 2026-07-05 · Reviewer: engineering pass over the full monorepo_

This document reviews the AI-Powered Customer Support System as a **portfolio project** and lays out a
prioritized plan to make it genuinely production-ready. Findings are grouped by severity. The AI layer has
already been switched from OpenAI to **xAI (Grok)** — see the note at the end.

---

## TL;DR

The codebase is clean, well-organized, and reads like production code: controller–service separation, a
shared Zod package, driver-adapter Prisma, SSE streaming, and a tidy React client. For a portfolio it already
demonstrates solid architecture instincts.

It is **not yet production-ready** primarily because of three things: **(1) no authentication/authorization**
(any client can read or delete any user's data by passing a `userId` string), **(2) the "agentic" AI layer is
largely cosmetic** (the LLM only rephrases a pre-computed draft; it never actually calls tools), and **(3) no
deployment story** (no app Dockerfiles, no CI, dependency version mismatches). Fixing P0 + P1 below turns this
from "good demo" into "defensible production system," and the P2 items are what make it stand out in a
portfolio.

---

## P0 — Blockers (must fix before "production")

### 1. No authentication or authorization — ✅ DONE
_Previously: `userId` was passed by the client and trusted verbatim, so anyone could read, write, or delete
any user's conversations._

Implemented **Firebase Google sign-in** (Google provider only, no email/password):
- Web: `signInWithPopup` gate; unauthenticated users see a "Sign in with Google" screen. The Firebase ID
  token is attached as `Authorization: Bearer <token>` on every API call.
- API: `requireAuth` middleware verifies the token with the Firebase Admin SDK and sets `userId` (the Firebase
  uid) on the request context. Handlers now derive `userId` from the verified token; `userId` was removed from
  all client-supplied input (`createMessageSchema`, query params).
- Remaining follow-up: per-route ownership checks already hold (queries are scoped by `userId`); consider adding
  token-revocation checks and short-lived session cookies if moving off bearer tokens.

### 2. Error handler leaks internal error messages — ✅ DONE
`errorHandler` now logs the full error server-side with a correlation `requestId` and returns a generic
`{ error: "Internal server error", requestId }`. A typed `HttpError` class lets handlers surface intentional
4xx messages without leaking internals.

### 3. Streaming errors are never surfaced — ✅ DONE
The SSE body in `chat.controller.ts` is wrapped in try/catch and emits the (previously unused) typed
`{ type: "error" }` event on failure. The web client handles it: shows an error banner, removes the empty
assistant placeholder bubble, and recovers cleanly. Network-level send failures show the same banner.

### 4. Prisma client / adapter version mismatch — ✅ DONE
All Prisma packages aligned on v6 (`@prisma/client@6.19`, `prisma@6.19`, `@prisma/adapter-pg@6.19`).
This also fixed two latent runtime bugs: `db.ts`/`seed.ts` were passing a `pg.Pool` to the v6 adapter (which
expects `{ connectionString }` config — it only typechecked by structural accident and would have connected to
the wrong database), and the schema was missing the datasource `url` that the v6 CLI validates. The unused `pg`
/ `@types/pg` deps were removed, and `prisma.config.ts` now loads dotenv explicitly (config files disable
Prisma's automatic .env loading). Also fixed en route: P1 #11 (`db.ts` now fails fast when `DATABASE_URL` is
unset instead of falling back to hardcoded credentials) and P1 #13 (the `done` SSE event now carries
`conversationId`, and the client adopts new conversations explicitly). The seed script accepts `SEED_USER_ID`
so seeded data can belong to a real Firebase uid.

### 5. No deployment artifacts
`docker-compose.yml` only starts Postgres. There is no Dockerfile for the API or web build, no `.dockerignore`,
no production start path documented beyond `node dist/server.js`.
- **Fix:** add multi-stage Dockerfiles for `apps/api` and `apps/web` (nginx to serve the built SPA), extend
  compose to run the full stack, and add a `migrate deploy` step (see #9).

---

## P1 — Hardening (needed for real traffic)

### 6. Rate limiter is in-memory and weakly keyed
`middleware/rate-limit.ts` keys on `x-forwarded-for ?? "local"` in a per-process `Map`.
- Doesn't survive restarts, doesn't work across instances, `x-forwarded-for` is client-spoofable, and every
  request (including `/api/health`) shares the limiter.
- **Fix:** move to a shared store (Redis) for multi-instance; trust proxy config to derive client IP; exclude
  health checks; add a stricter per-user limit on the expensive `POST /messages` path.

### 7. CORS is fully open
`app.use("*", cors())` allows all origins.
- **Fix:** restrict to an allow-list from `CORS_ORIGIN` env; disable credentials unless needed.

### 8. No input limits / cost controls on the LLM path
`content` has only `min(1)` in the Zod schema — unbounded length flows straight into the Grok prompt.
- **Fix:** cap `content` length (e.g., `max(4000)`), cap conversation history sent to the model, and add a
  timeout + token cap on the Grok call. Consider per-user daily message quotas.

### 9. Schema is pushed, not migrated
Setup uses `prisma db push` (no migration history). Fine for a demo, unsafe for production evolution.
- **Fix:** switch to `prisma migrate dev` locally and `prisma migrate deploy` in the release pipeline; commit
  the `migrations/` folder.

### 10. Health check doesn't verify dependencies
`/api/health` returns `{ ok: true }` unconditionally — it's green even if Postgres is down.
- **Fix:** add a readiness probe that runs `SELECT 1` and reports DB status; keep a cheap liveness probe.

### 11. Hardcoded DB fallback credentials
`db.ts` falls back to `postgresql://postgres:postgres@localhost...` when `DATABASE_URL` is unset.
- **Fix:** in production, fail fast if `DATABASE_URL` is missing (the seed script already does this — apply the
  same rule to `db.ts`).

### 12. No observability
No structured logging, request ids, metrics, or tracing.
- **Fix:** add a logger (pino), a request-id middleware, and basic latency/error metrics. Log which agent
  handled each message and Grok latency/token usage.

### 13. Client new-conversation handling is fragile
In `apps/web/src/App.tsx`, when a **new** conversation is created server-side, the `done` event only returns
`messageId` — never the new `conversationId`. The client relies on `loadConversations()` re-sorting and
`activeConversationId` being unset to pick it up. This is racy and breaks if ordering changes.
- **Fix:** include `conversationId` in the `done` event (and schema), then `setActiveConversationId` explicitly.

---

## P2 — Portfolio shine (what makes it stand out)

### 14. Make the AI layer genuinely agentic (highest-impact upgrade)
Today each agent computes a canned draft string from a DB query, and `AiStreamService` just asks Grok to
**rephrase the draft**. The model never sees the tools or decides anything — so "multi-agent" and
"database-backed tools" are real for routing/data but the *reasoning* is cosmetic.
- **Upgrade:** give each agent real tool definitions and let Grok call them via the AI SDK's `tools` +
  `maxSteps` (function calling). The model decides which tool to invoke, reads the tool result, and composes
  the answer. This turns the project into a true tool-calling agent system and is the single biggest résumé
  differentiator here. (xAI/Grok supports OpenAI-compatible tool calling.)
- Keyword routing (`router.service.ts`) can stay as a cheap fast-path, with an LLM classifier fallback for
  ambiguous inputs like "cancel my subscription" (currently routed to **order** because of the `cancel`
  keyword, though it's a **billing** intent).

### 15. Test coverage is thin
Only 3 router unit tests. No controller/integration tests, no web tests.
- **Add:** integration tests for the chat flow (persistence + streaming) against a test DB, agent unit tests,
  and a couple of React Testing Library tests for the chat UI. Wire coverage thresholds.

### 16. No CI/CD
- **Add:** a GitHub Actions workflow: install → lint (`tsc --noEmit`) → test → build → (optional) Docker build.
  This is table-stakes signal for a portfolio repo.

### 17. Frontend polish
- No error state when a send fails (only `console.error`), no optimistic rollback, hardcoded `user_001`,
  no message timestamps/markdown rendering, no auto-scroll-to-bottom, no delete-conversation UI (endpoint
  exists, no button).
- Add an error toast, loading/empty states, markdown rendering for assistant messages, and wire the delete
  endpoint into `ConversationList`.

### 18. Documentation accuracy
The README claims "production-ready" — after P0/P1 that becomes true. Add an architecture diagram of the
tool-calling flow (#14), an env-var reference table, and a "Deployment" section once Dockerfiles land.

---

## Suggested execution order

1. **P0 #1 auth**, **#2/#3 error handling**, **#4 version fix** — correctness & security foundation.
2. **P0 #5 Dockerfiles + P1 #9 migrations + P2 #16 CI** — make it deployable and continuously verified.
3. **P1 #6–#12** — hardening for real traffic.
4. **P2 #14 real tool-calling agents** — the flagship upgrade; do this once the base is solid.
5. **P2 #15/#17/#18** — tests, UX polish, docs.

---

## Already done in this pass

- **Switched the AI provider from OpenAI → xAI (Grok).** `AiStreamService` now calls Grok through its
  OpenAI-compatible endpoint (`https://api.x.ai/v1`) via `createOpenAI` — no new dependency, works on the
  existing AI SDK v4. Reads `XAI_API_KEY` (or `GROK_API_KEY`), model configurable via `XAI_MODEL`
  (default `grok-3`), with graceful fallback to deterministic streaming if the key is absent or the call fails.
- Updated `.env.example` (root + api), README env/stack sections accordingly.
- Verified: `tsc --noEmit` clean, all tests pass.
