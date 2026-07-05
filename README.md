# AI-Powered Customer Support System

A production-ready, fullstack customer support platform built with a multi-agent architecture. The system routes incoming user messages through a classifier agent to specialized sub-agents for support, orders, and billing — with all conversations persisted in PostgreSQL and responses streamed live to the UI.

---

## Overview

This project demonstrates a practical implementation of an agentic AI backend integrated with a clean, responsive React frontend. It is designed around real-world engineering concerns: separation of concerns in the backend, live streaming UX, multi-agent orchestration, database-backed tool access, and persistent conversation state.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React, Vite, TypeScript |
| Backend | Hono, TypeScript |
| Database | PostgreSQL |
| ORM | Prisma |
| Monorepo | Turborepo |
| AI Layer | Vercel AI SDK + xAI (Grok) with deterministic fallback streaming |

---

## Architecture

```
User Message
     │
     ▼
POST /api/chat/messages
     │
     ▼
Message persisted to PostgreSQL
     │
     ▼
Router Agent — classifies intent
     │
     ├── Support Agent   → queries conversation history
     ├── Order Agent     → fetches order + tracking data
     └── Billing Agent   → retrieves invoices + refund status
                │
                ▼
        Response streamed to client
                │
                ▼
        Message saved as assistant turn
```

1. The frontend sends a user message to `POST /api/chat/messages`.
2. The backend persists the message in the conversation table.
3. The router agent classifies the message as support, order, or billing.
4. The matched sub-agent calls its own tool layer to query the database.
5. The assistant response is streamed back to the client.
6. The response is saved as an assistant message and returned in conversation history.

---

## Key Features

### Multi-Agent Routing

The router agent classifies each message into one of three paths:

- **Support** — FAQs, troubleshooting, and general help
- **Order** — Order status, tracking, modification, and cancellation
- **Billing** — Payments, invoices, refunds, and subscriptions

Unclassified messages fall back to the support agent.

### Database-Backed Agent Tools

Each sub-agent has dedicated tools backed by real database queries — not hardcoded responses.

| Agent | Tools |
|---|---|
| Support Agent | Queries prior conversation history for context |
| Order Agent | Fetches order details, delivery status, and tracking data |
| Billing Agent | Retrieves invoices, refund history, and refund status |

### Conversation Persistence

All conversations and messages are stored in PostgreSQL, enabling:

- Resumable conversations from any prior session
- Contextual agent responses based on message history
- A conversation sidebar listing all sessions per user

### Streaming UX

Responses are streamed to the frontend in real time. A typing indicator is shown while the assistant is processing, making the chat feel immediate and responsive.

---

## Project Structure

```
.
├── apps/
│   ├── api/
│   │   ├── prisma/
│   │   │   ├── schema.prisma
│   │   │   └── seed.ts
│   │   └── src/
│   │       ├── app.ts
│   │       ├── server.ts
│   │       ├── db.ts
│   │       ├── controllers/
│   │       ├── routes/
│   │       ├── middleware/
│   │       ├── services/
│   │       └── tests/
│   └── web/
│       └── src/
│           ├── App.tsx
│           ├── main.tsx
│           ├── styles.css
│           ├── types.ts
│           ├── components/
│           └── lib/
└── packages/
    └── shared/
        └── src/
            └── index.ts
```

| Directory | Purpose |
|---|---|
| `apps/api/src/controllers` | Request handlers for chat and agent endpoints |
| `apps/api/src/routes` | Hono route composition for `/api/chat`, `/api/agents`, `/api/health` |
| `apps/api/src/services` | Business logic for conversations, routing, AI streaming, and domain services |
| `apps/api/src/services/tools` | Database-backed tools consumed by each agent |
| `apps/api/src/middleware` | Error handling and rate limiting |
| `apps/api/prisma` | Prisma schema and database seed script |
| `apps/web/src/components` | Reusable UI components for the chat screen |
| `apps/web/src/lib` | API helpers and streaming client logic |
| `packages/shared` | Shared Zod schemas and types used across frontend and backend |

---

## API Reference

### Chat

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/chat/messages` | Send a message and stream the assistant response |
| `GET` | `/api/chat/conversations/:id` | Fetch a single conversation with message history |
| `GET` | `/api/chat/conversations` | List all conversations for a user |
| `DELETE` | `/api/chat/conversations/:id` | Delete a conversation |

### Agents

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/agents` | List available agents |
| `GET` | `/api/agents/:type/capabilities` | Get capabilities for a specific agent |

### Health

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/health` | Health check |

---

## Local Setup

### Prerequisites

- Node.js 20+
- npm 10+
- PostgreSQL 16, or Docker

### Environment

Copy the environment template:

```bash
cp .env.example .env
```

Default values for local development:

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/support_db?schema=public"
GROQ_API_KEY=""
XAI_API_KEY=""
AI_MODEL=""
PORT="3000"
VITE_API_BASE_URL="http://localhost:3000"
```

> The AI key is optional — when omitted, the backend streams a deterministic fallback response. Two providers are supported through their OpenAI-compatible endpoints (no extra SDK): **Groq** (`GROQ_API_KEY`, keys start with `gsk_`, default model `llama-3.3-70b-versatile`) and **xAI Grok** (`XAI_API_KEY`, keys start with `xai-`, default model `grok-3`). Groq takes priority if both are set; override the model with `AI_MODEL`.

### Authentication (Firebase Google Sign-In)

The app uses **Firebase Authentication with the Google provider only** (no email/password). Users must sign in
with Google before they can chat; each user only sees their own conversations.

**One-time Firebase setup:**

1. In the [Firebase console](https://console.firebase.google.com), create a project and a **Web app**.
2. Under **Authentication → Sign-in method**, enable **Google**.
3. Copy the web config into `apps/web/.env` (see `apps/web/.env.example`):
   `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`, `VITE_FIREBASE_PROJECT_ID`, `VITE_FIREBASE_APP_ID`.
   These are public client keys — safe to ship in the browser bundle.
4. Under **Project settings → Service accounts → Generate new private key**, download the JSON and put its
   values into `apps/api/.env` (see `apps/api/.env.example`): `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`,
   `FIREBASE_PRIVATE_KEY`. **These are secrets** — never commit them.
5. `localhost` is an authorized domain by default; add your production domain under
   **Authentication → Settings → Authorized domains** when you deploy.

### Installation

```bash
# Install dependencies
npm install

# Start PostgreSQL
docker compose up -d

# Generate Prisma client and sync schema
npm run db:generate
npm run db:push

# Seed sample data
npm run db:seed

# Start API and frontend
npm run dev
```

The apps will run at:

- API: `http://localhost:3000`
- Web UI: `http://localhost:5173`

---

## Try It Out

By default the seed script creates data for a sample user `user_001`. Since real users sign in with Google,
seed the data against **your own Firebase uid** so it shows up in your account:

```bash
SEED_USER_ID="<your-firebase-uid>" npm run db:seed
```

(Find your uid in the Firebase console under Authentication → Users after your first sign-in.)

Try these prompts in the chat UI:

| Prompt | Expected Agent |
|---|---|
| `Where is my order ORD-1001?` | Order Agent |
| `Show my latest invoice` | Billing Agent |
| `What is the status of my refund?` | Billing Agent |
| `I need help with my account` | Support Agent |

Responses stream into the UI progressively. Conversations are saved and accessible from the sidebar.

---

## Commands

| Command | Description |
|---|---|
| `npm run dev` | Start API and frontend via Turborepo |
| `npm run lint` | TypeScript validation across the workspace |
| `npm test` | Run workspace tests |
| `npm run db:generate` | Generate Prisma client |
| `npm run db:push` | Push schema to PostgreSQL |
| `npm run db:seed` | Seed sample conversations, orders, invoices, and refunds |

---

## Files Worth Reviewing

| File | What it shows |
|---|---|
| `apps/api/src/app.ts` | API composition and middleware |
| `apps/api/src/controllers/chat.controller.ts` | Chat request handling and streaming |
| `apps/api/src/services/router.service.ts` | Intent classification and routing logic |
| `apps/api/src/services/agents/` | Agent implementations |
| `apps/api/src/services/tools/` | Database-backed tools per agent |
| `apps/api/prisma/schema.prisma` | Database model structure |
| `apps/api/prisma/seed.ts` | Sample data setup |
| `apps/web/src/App.tsx` | Main chat experience |
| `apps/web/src/lib/api.ts` | Client helpers and streaming parser |

---

## Engineering Highlights

- Controller-service pattern with clear separation of concerns
- Parent router agent with three specialized sub-agents
- Each sub-agent has at least one real database-backed tool
- Conversation state persists across sessions in PostgreSQL
- Frontend lists conversations and renders full chat history
- Assistant responses stream to the UI in real time
- Typing indicator displayed during generation
- Graceful fallback path for unclassified queries
- Shared Zod schemas between frontend and backend via monorepo package
