import type { Context, Next } from "hono";

type Bucket = {
  count: number;
  resetAt: number;
};

const WINDOW_MS = 60_000;
const MAX_REQUESTS = 60;
const buckets = new Map<string, Bucket>();

export async function rateLimit(c: Context, next: Next) {
  const key = c.req.header("x-forwarded-for") ?? "local";
  const now = Date.now();
  const existing = buckets.get(key);

  if (!existing || now > existing.resetAt) {
    buckets.set(key, {
      count: 1,
      resetAt: now + WINDOW_MS,
    });
    await next();
    return;
  }

  if (existing.count >= MAX_REQUESTS) {
    return c.json(
      {
        error: "Rate limit exceeded. Try again in a minute.",
      },
      429,
    );
  }

  existing.count += 1;
  buckets.set(key, existing);
  await next();
}
