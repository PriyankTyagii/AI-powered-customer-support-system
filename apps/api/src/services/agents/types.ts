import type { AgentType } from "@support/shared";

export type AgentContext = {
  userId: string;
  content: string;
};

export type AgentResponse = {
  type: AgentType;
  response: string;
  reasoning: string;
};
