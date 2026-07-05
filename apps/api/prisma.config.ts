// Using prisma.config.ts disables Prisma's automatic .env loading, so load it here.
import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
});
