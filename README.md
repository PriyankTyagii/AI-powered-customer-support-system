# AI-Powered Customer Support System

Fullstack monorepo for an AI-powered customer support assistant with a router agent, three specialized sub-agents, persistent conversations, streaming responses, and a Hono backend with a React/Vite frontend.

## Stack

- Frontend: React + Vite
- Backend: Hono
- Database: PostgreSQL
- ORM: Prisma
- Monorepo: Turborepo

## Project Layout

- `apps/api` - Hono API, agent routing, Prisma models, seed data
- `apps/web` - Chat UI with conversation list and streaming responses
- `packages/shared` - Shared schemas and types

## Prerequisites

- Node.js 20+
- npm 10+
- PostgreSQL 16+ or Docker

## Setup

1. Install dependencies.

   ```bash
   npm install
   ```

2. Create environment files.

   - Copy `.env.example` to `.env` at the repo root.
   - If you prefer app-specific files, `apps/api/.env.example` and `apps/web/.env.example` are included too.

3. Start PostgreSQL.

   ```bash
   docker compose up -d
   ```

4. Prepare Prisma.

   ```bash
   npm run db:generate
   npm run db:push
   npm run db:seed
   ```

5. Start the apps.

   ```bash
   npm run dev
   ```

   The API runs on `http://localhost:3000` and the web app runs on `http://localhost:5173`.

## Environment Variables

Root `.env` or `apps/api/.env` should include:

```bash
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/support_db?schema=public"
OPENAI_API_KEY=""
PORT="3000"
VITE_API_BASE_URL="http://localhost:3000"
```

The app works without `OPENAI_API_KEY`; it falls back to deterministic streaming output.

## Useful Commands

- `npm run lint` - TypeScript check for all packages
- `npm test` - Run workspace tests
- `npm run db:generate` - Generate Prisma client
- `npm run db:push` - Push schema to the database
- `npm run db:seed` - Seed sample conversations, orders, invoices, and refunds

## API Routes

- `POST /api/chat/messages`
- `GET /api/chat/conversations/:id`
- `GET /api/chat/conversations`
- `DELETE /api/chat/conversations/:id`
- `GET /api/agents`
- `GET /api/agents/:type/capabilities`
- `GET /api/health`

## Notes

- The router classifies user intent and delegates to the support, order, or billing agent.
- Conversation and message history is persisted in PostgreSQL.
- The frontend displays a typing indicator and streams agent output incrementally.
