import "dotenv/config";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { handleError } from "./middleware/error-handler";
import { rateLimit } from "./middleware/rate-limit";
import { requireAuth } from "./middleware/auth";
import { chatRoutes } from "./routes/chat.routes";
import { agentsRoutes } from "./routes/agents.routes";
import { storeRoutes } from "./routes/store.routes";

const app = new Hono();

// Restrict CORS to the configured origins in production; allow any in dev.
// CORS_ORIGIN is a comma-separated allow-list (e.g. the deployed web URL).
const allowedOrigins = process.env.CORS_ORIGIN?.split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(
  "*",
  cors({
    origin: allowedOrigins && allowedOrigins.length ? allowedOrigins : "*",
    allowHeaders: ["Content-Type", "Authorization"],
    allowMethods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
  }),
);
app.use("*", rateLimit);
app.onError(handleError);

app.get("/api/health", (c) => c.json({ ok: true, ts: new Date().toISOString() }));

// Chat and store routes operate on the authenticated user's own data.
app.use("/api/chat/*", requireAuth);
app.use("/api/store/*", requireAuth);
app.route("/api/chat", chatRoutes);
app.route("/api/store", storeRoutes);
app.route("/api/agents", agentsRoutes);

export type AppType = typeof app;
export default app;
