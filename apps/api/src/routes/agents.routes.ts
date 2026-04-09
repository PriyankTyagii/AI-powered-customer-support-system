import { Hono } from "hono";
import { AgentsController } from "../controllers/agents.controller";

const controller = new AgentsController();

export const agentsRoutes = new Hono()
  .get("/agents", controller.listAgents)
  .get("/agents/:type/capabilities", controller.getCapabilities);
