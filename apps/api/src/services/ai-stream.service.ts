import { createOpenAI } from "@ai-sdk/openai";
import { streamText } from "ai";

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

const provider = resolveProvider();

export class AiStreamService {
  async *streamResponse(input: { response: string; reasoning: string }) {
    if (provider) {
      // AI SDK v4 suppresses stream errors unless onError is provided, which
      // would otherwise surface as a silently empty stream.
      let streamError: unknown;
      let emitted = false;

      try {
        const result = streamText({
          model: provider.client(provider.model),
          system:
            "You are a customer support AI. Respond with concise and accurate answers. Keep context and keep a helpful tone.",
          prompt: `Reasoning context: ${input.reasoning}\nDraft answer: ${input.response}`,
          onError: ({ error }) => {
            streamError = error;
          },
        });

        for await (const chunk of result.textStream) {
          emitted = true;
          yield chunk;
        }
      } catch (error) {
        streamError = error;
      }

      if (!streamError && emitted) {
        return;
      }

      // Degrade gracefully to the deterministic draft instead of returning
      // nothing / breaking the SSE connection.
      console.error("AI stream failed, falling back to draft response:", streamError);

      if (emitted) {
        // Partial output already reached the client; don't duplicate content.
        return;
      }
    }

    yield* this.streamFallback(input.response);
  }

  private async *streamFallback(response: string) {
    const chunks = response.split(" ");
    for (const chunk of chunks) {
      yield `${chunk} `;
    }
  }
}
