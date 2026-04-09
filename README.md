# AI-Powered Customer Support System

This project is a fullstack customer support assistant built as a monorepo. It uses a router agent to classify incoming user messages and delegate them to specialized sub-agents for support, orders, and billing. Conversations are persisted in PostgreSQL, responses are streamed back to the UI, and the frontend shows live typing feedback so the chat feels responsive.

The goal of this repository is to demonstrate practical backend structure, agent routing, tool-based data access, persistent chat history, and a clean React UI that is easy to evaluate.

## What This Project Demonstrates

- Controller-service backend structure with clear separation of concerns
- Multi-agent routing with a parent router agent and three sub-agents
- Tool-style data access backed by real database queries
- Persistent conversations and messages
- Streaming chat responses and typing indicator support
- Hono REST API with a React + Vite frontend
- Shared types and schemas in a monorepo-friendly layout

## Tech Stack

- Frontend: React, Vite, TypeScript
- Backend: Hono, TypeScript
- Database: PostgreSQL
- ORM: Prisma
- Monorepo: Turborepo
- AI layer: Vercel AI SDK pattern with fallback streaming output

## High-Level Architecture

1. The frontend sends a user message to `POST /api/chat/messages`.
2. The backend persists the user message in the conversation table.
3. The router agent classifies the message as support, order, or billing.
4. The selected sub-agent calls its own tool layer to fetch data from the database.
5. The assistant response is streamed to the client.
6. The response is stored as an assistant message and returned in the conversation history.

## Folder Structure

```text
.
|-- apps/
|   |-- api/
|   |   |-- prisma/
|   |   |   |-- schema.prisma
|   |   |   |-- seed.ts
|   |   |-- src/
|   |   |   |-- app.ts
|   |   |   |-- server.ts
|   |   |   |-- db.ts
|   |   |   |-- controllers/
|   |   |   |-- routes/
|   |   |   |-- middleware/
|   |   |   |-- services/
|   |   |   |-- tests/
|   |   |-- prisma.config.ts
|   |   |-- package.json
|   |   |-- tsconfig.json
|   |   |-- .env.example
|   |-- web/
|   |   |-- src/
|   |   |   |-- App.tsx
|   |   |   |-- main.tsx
|   |   |   |-- styles.css
|   |   |   |-- types.ts
|   |   |   |-- components/
|   |   |   |-- lib/
|   |   |-- index.html
|   |   |-- vite.config.ts
|   |   |-- package.json
|   |   |-- tsconfig.json
|   |   |-- tsconfig.node.json
|   |   |-- .env.example
|-- packages/
|   |-- shared/
|   |   |-- src/
|   |   |   |-- index.ts
|   |   |-- package.json
|   |   |-- tsconfig.json
|-- .env.example
|-- docker-compose.yml
|-- package.json
|-- turbo.json
|-- tsconfig.base.json
|-- submission.zip
```

### Folder Details

- `apps/api`: Hono backend, route handlers, controller-service logic, Prisma schema, seed data, agent routing, and the tool implementations used by each agent.
- `apps/api/src/controllers`: Request handlers for chat and agent endpoints.
- `apps/api/src/routes`: Hono route composition for `/api/chat`, `/api/agents`, and `/api/health`.
- `apps/api/src/services`: Business logic for conversations, agent routing, AI streaming, and tool-backed domain services.
- `apps/api/src/services/tools`: Database-backed tools used by the support, order, and billing agents.
- `apps/api/src/middleware`: Error handling and rate limiting.
- `apps/api/prisma`: Prisma schema and database seed script.
- `apps/web`: React chat interface with a conversation sidebar, streaming chat panel, and typing indicator.
- `apps/web/src/components`: UI pieces used by the chat screen.
- `apps/web/src/lib`: API helper functions and streaming client logic.
- `packages/shared`: Shared Zod schemas and common types used by both frontend and backend.
- `.env.example`: Root environment template for local development.
- `docker-compose.yml`: Local PostgreSQL container definition.
- `submission.zip`: Packaged version of the project for submission.

## Core Features

### Router Agent

The router agent analyzes each incoming message and classifies it into one of three paths:

- Support: FAQs, troubleshooting, and general help
- Order: Order status, tracking, modification, and cancellation
- Billing: Payments, invoices, refunds, and subscriptions

If a message does not match a specific intent, the system falls back to support handling.

### Sub-Agents and Their Tools

- Support Agent
  - Queries prior conversation history
  - Uses past user context to keep replies relevant

- Order Agent
  - Fetches order details
  - Checks delivery status and tracking data

- Billing Agent
  - Retrieves invoice details
  - Checks refund history and refund status

These tools read from the database, so the system is not just returning hard-coded responses.

### Conversation Persistence

Conversations and messages are saved in PostgreSQL. That means:

- The user can reopen a conversation and continue from the same history
- The router and agents can use recent messages as context
- The UI can list multiple conversations for the same user

### Streaming UX

The chat response is streamed back to the frontend. The UI also displays a typing indicator so the user sees that the assistant is processing the request.

## API Routes

### Chat

- `POST /api/chat/messages` - Send a new message and stream the assistant response
- `GET /api/chat/conversations/:id` - Get a single conversation with message history
- `GET /api/chat/conversations` - List conversations for a user
- `DELETE /api/chat/conversations/:id` - Delete a conversation

### Agents

- `GET /api/agents` - List all available agents
- `GET /api/agents/:type/capabilities` - Get capabilities for a specific agent

### Health

- `GET /api/health` - Health check endpoint

## Prerequisites

- Node.js 20 or newer
- npm 10 or newer
- PostgreSQL 16 or Docker

## Environment Setup

Copy the root example file to a real environment file:

```bash
cp .env.example .env
```

Use these values for local development:

```bash
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/support_db?schema=public"
OPENAI_API_KEY=""
PORT="3000"
VITE_API_BASE_URL="http://localhost:3000"
```

Notes:

- `DATABASE_URL` is required for Prisma and the backend.
- `VITE_API_BASE_URL` tells the frontend where the API is running.
- `OPENAI_API_KEY` is optional. If it is blank, the backend uses fallback deterministic streaming output.

## Local Setup

1. Install dependencies.

   ```bash
   npm install
   ```

2. Start PostgreSQL.

   ```bash
   docker compose up -d
   ```

3. Generate the Prisma client and sync the schema.

   ```bash
   npm run db:generate
   npm run db:push
   ```

4. Seed sample data.

   ```bash
   npm run db:seed
   ```

5. Start the backend and frontend.

   ```bash
   npm run dev
   ```

The apps will run at:

- API: `http://localhost:3000`
- Web UI: `http://localhost:5173`

## How to Test the App

Use the seeded user `user_001` and try these prompts in the chat UI:

- `Where is my order ORD-1001?`
- `Show my latest invoice`
- `What is the status of my refund?`
- `I need help with my account`

Expected behavior:

- Order questions should route to the order agent
- Billing questions should route to the billing agent
- General help should route to the support agent
- The response should stream into the UI instead of appearing all at once
- The conversation should be saved and re-loadable from the sidebar

## Useful Commands

- `npm run dev` - Run API and web app together through Turbo
- `npm run lint` - TypeScript validation across the workspace
- `npm test` - Run workspace tests
- `npm run db:generate` - Generate Prisma client
- `npm run db:push` - Push the schema to PostgreSQL
- `npm run db:seed` - Seed sample conversations, orders, invoices, and refunds

## Testing Notes for Evaluators

When reviewing the code, the most important files to inspect are:

- [apps/api/src/app.ts](apps/api/src/app.ts) - API composition and middleware
- [apps/api/src/controllers/chat.controller.ts](apps/api/src/controllers/chat.controller.ts) - Chat request handling and streaming
- [apps/api/src/services/router.service.ts](apps/api/src/services/router.service.ts) - Intent classification and routing logic
- [apps/api/src/services/agents/](apps/api/src/services/agents) - Agent implementations
- [apps/api/src/services/tools/](apps/api/src/services/tools) - Database-backed tools used by each agent
- [apps/api/prisma/schema.prisma](apps/api/prisma/schema.prisma) - Database model structure
- [apps/api/prisma/seed.ts](apps/api/prisma/seed.ts) - Sample data setup
- [apps/web/src/App.tsx](apps/web/src/App.tsx) - Main chat experience
- [apps/web/src/lib/api.ts](apps/web/src/lib/api.ts) - Client helpers and streaming parsing

## Evaluation Checklist

- Controller-service pattern is used in the backend
- Each sub-agent has at least one real database-backed tool
- Conversation state persists in the database
- The frontend can list conversations and display chat history
- The assistant response is streamed to the UI
- A typing indicator is shown during generation
- There is a clear fallback path for unclassified queries
- The repository includes sample data and setup instructions

## Submission Artifact

The packaged submission archive is included at [submission.zip](submission.zip).
