import "hono";

// Typed context variables set by middleware (e.g. requireAuth).
declare module "hono" {
  interface ContextVariableMap {
    userId: string;
  }
}
