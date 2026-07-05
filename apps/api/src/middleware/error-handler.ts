import { randomUUID } from "node:crypto";
import type { Context } from "hono";

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
 * App-level error handler, registered via `app.onError`. Hono catches thrown
 * errors at the throwing handler's own dispatch frame and routes them here —
 * they never propagate up through middleware, so a try/catch middleware would
 * never see them.
 *
 * Known HttpErrors pass their message through; everything else is logged with
 * a correlation id and returned as a generic 500 so internal details (stack
 * traces, DB errors) never leak to clients.
 */
export function handleError(error: Error, c: Context) {
  if (error instanceof HttpError) {
    return c.json({ error: error.message }, error.status);
  }

  const requestId = randomUUID();
  console.error(`[${requestId}] ${c.req.method} ${c.req.path} failed:`, error);
  return c.json({ error: "Internal server error", requestId }, 500);
}
