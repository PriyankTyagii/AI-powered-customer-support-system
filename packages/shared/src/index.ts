import { z } from "zod";

export const agentTypeSchema = z.enum(["support", "order", "billing"]);
export type AgentType = z.infer<typeof agentTypeSchema>;

// userId is derived server-side from the verified Firebase token, never sent by the client.
export const createMessageSchema = z.object({
  conversationId: z.string().optional(),
  content: z.string().min(1).max(4000),
});

export type CreateMessageInput = z.infer<typeof createMessageSchema>;

export const conversationSchema = z.object({
  id: z.string(),
  userId: z.string(),
  title: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const messageSchema = z.object({
  id: z.string(),
  conversationId: z.string(),
  role: z.enum(["user", "assistant"]),
  content: z.string(),
  agentType: agentTypeSchema.optional(),
  createdAt: z.string(),
});

export const agentCapabilitySchema = z.object({
  type: agentTypeSchema,
  name: z.string(),
  description: z.string(),
  tools: z.array(z.string()),
});

export const typingEventSchema = z.object({
  type: z.literal("typing"),
  value: z.boolean(),
  label: z.string().optional(),
});

export const deltaEventSchema = z.object({
  type: z.literal("delta"),
  text: z.string(),
});

export const doneEventSchema = z.object({
  type: z.literal("done"),
  messageId: z.string(),
  // Returned so the client can adopt a newly created conversation immediately.
  conversationId: z.string(),
});

export const errorEventSchema = z.object({
  type: z.literal("error"),
  message: z.string(),
});

export const streamEventSchema = z.discriminatedUnion("type", [
  typingEventSchema,
  deltaEventSchema,
  doneEventSchema,
  errorEventSchema,
]);

export type StreamEvent = z.infer<typeof streamEventSchema>;
