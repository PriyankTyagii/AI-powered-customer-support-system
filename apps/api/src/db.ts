import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  // Never fall back to implicit credentials in production; fail loudly.
  throw new Error("DATABASE_URL is required. Set it in the environment or .env file.");
}

// Prisma 6 driver adapter: PrismaPg manages its own pg pool from the config.
// The CLI reads ?schema= from the URL, but the runtime adapter needs it passed
// explicitly — otherwise queries would target the default `public` schema.
const schema = new URL(connectionString).searchParams.get("schema") ?? undefined;
const adapter = new PrismaPg({ connectionString }, schema ? { schema } : undefined);

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter,
    log: ["error", "warn"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
