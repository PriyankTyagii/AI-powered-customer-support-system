# Builds and runs the Hono API for the AI support system.
# The API is run with tsx (like local dev) so the workspace `@support/shared`
# TypeScript package resolves without a separate build step.
FROM node:20-bookworm-slim

WORKDIR /app

# Install workspace dependencies. Copy only manifests first for better caching.
# tsx (a devDependency) is needed at runtime, so install dev deps too.
COPY package.json package-lock.json ./
COPY packages/shared/package.json packages/shared/
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
RUN npm ci --include=dev

# Copy the sources the API needs (shared package + API app).
COPY tsconfig.base.json ./
COPY packages/shared packages/shared
COPY apps/api apps/api

# Generate the Prisma client. A placeholder URL satisfies schema validation;
# no database connection is made during generation.
RUN DATABASE_URL="postgresql://placeholder:placeholder@localhost:5432/placeholder" \
    npm run db:generate

ENV NODE_ENV=production
# Render injects PORT; server.ts reads process.env.PORT (defaults to 3000).
EXPOSE 3000

CMD ["npx", "tsx", "apps/api/src/server.ts"]
