import type { Context, Next } from "hono";
import { verifyIdToken } from "../lib/firebase";

/**
 * Requires a valid Firebase ID token in the `Authorization: Bearer <token>`
 * header. On success the verified Firebase uid is stored on the context as
 * `userId` — handlers must derive the user from here, never from client input.
 */
export async function requireAuth(c: Context, next: Next) {
  const header = c.req.header("Authorization");
  const token = header?.startsWith("Bearer ") ? header.slice(7).trim() : undefined;

  if (!token) {
    return c.json({ error: "Missing or invalid Authorization header" }, 401);
  }

  try {
    const decoded = await verifyIdToken(token);
    c.set("userId", decoded.uid);
  } catch (error) {
    console.error("Auth verification failed:", error);
    return c.json({ error: "Unauthorized" }, 401);
  }

  await next();
}
