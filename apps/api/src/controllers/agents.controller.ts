import { agentTypeSchema } from "@support/shared";
import type { Context } from "hono";
import { agentCapabilities } from "../services/agent-capabilities.service";

export class AgentsController {
  listAgents = async (c: Context) => {
    return c.json(Object.values(agentCapabilities));
  };

  getCapabilities = async (c: Context) => {
    const type = c.req.param("type");
    const parsed = agentTypeSchema.safeParse(type);

    if (!parsed.success) {
      return c.json({ error: "Invalid agent type" }, 400);
    }

    return c.json(agentCapabilities[parsed.data]);
  };
}
