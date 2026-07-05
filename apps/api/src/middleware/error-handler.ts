import { randomUUID } from "node:crypto";
import type { Context, Next } from "hono";

/** Errors handlers can throw to control the client-facing status/message. */
export class HttpError extends Error {
  constructor(
    public readonly status: 400 | 401 | 403 | 404 | 409 | 429,
    message: string,
  ) {
    super(message);
    this.name = "HttpError";
  }
}

/**
 * Catches unhandled errors. Known HttpErrors pass their message through;
 * everything else is logged with a correlation id and returned as a generic
 * 500 so internal details (stack traces, DB errors) never leak to clients.
 */
export async function errorHandler(c: Context, next: Next) {
  try {
    await next();
  } catch (error) {
    if (error instanceof HttpError) {
      return c.json({ error: error.message }, error.status);
    }

    const requestId = randomUUID();
    console.error(`[${requestId}] ${c.req.method} ${c.req.path} failed:`, error);
    return c.json({ error: "Internal server error", requestId }, 500);
  }
}
