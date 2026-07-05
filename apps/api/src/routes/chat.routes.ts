import { Hono } from "hono";
import { ChatController } from "../controllers/chat.controller";

const controller = new ChatController();

export const chatRoutes = new Hono()
  .post("/messages", controller.postMessage)
  .get("/conversations/:id", controller.getConversation)
  .get("/conversations", controller.listConversations)
  .patch("/conversations/:id", controller.renameConversation)
  .delete("/conversations/:id", controller.deleteConversation);
