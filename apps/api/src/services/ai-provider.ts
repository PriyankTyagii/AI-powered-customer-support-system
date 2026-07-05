import { createOpenAI } from "@ai-sdk/openai";

/** Read an env var, treating empty/whitespace-only values as unset. */
function env(name: string): string | undefined {
  const value = process.env[name];
  return value && value.trim() !== "" ? value : undefined;
}

/**
 * Both supported providers expose OpenAI-compatible APIs, so we reuse the
 * OpenAI provider client with a custom baseURL — no extra SDK needed.
 *
 * - Groq (https://groq.com): keys start with "gsk_". Fast open-model inference.
 * - xAI Grok (https://x.ai): keys start with "xai-".
 *
 * Set GROQ_API_KEY or XAI_API_KEY; Groq wins if both are present.
 * Override the model with AI_MODEL.
 */
function resolveProvider() {
  const groqKey = env("GROQ_API_KEY");
  if (groqKey) {
    return {
      client: createOpenAI({ apiKey: groqKey, baseURL: "https://api.groq.com/openai/v1" }),
      model: env("AI_MODEL") ?? "llama-3.3-70b-versatile",
    };
  }

  const xaiKey = env("XAI_API_KEY") ?? env("GROK_API_KEY");
  if (xaiKey) {
    return {
      client: createOpenAI({ apiKey: xaiKey, baseURL: "https://api.x.ai/v1" }),
      model: env("AI_MODEL") ?? env("XAI_MODEL") ?? "grok-3",
    };
  }

  return null;
}

export const aiProvider = resolveProvider();
