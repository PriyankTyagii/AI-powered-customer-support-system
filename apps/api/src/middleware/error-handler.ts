import type { Context, Next } from "hono";

export async function errorHandler(c: Context, next: Next) {
  try {
    await next();
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return c.json({ error: message }, 500);
  }
}
