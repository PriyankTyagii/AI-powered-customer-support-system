import { generateText } from "ai";
import { aiProvider } from "./ai-provider";

/**
 * Generate a short human-friendly thread title from the opening message,
 * e.g. "Refund for GaN charger order" instead of the raw question text.
 * Falls back to a truncation when no provider is configured or the call fails.
 */
export async function generateConversationTitle(content: string): Promise<string> {
  const fallback = content.slice(0, 60);

  if (!aiProvider) {
    return fallback;
  }

  try {
    const result = await generateText({
      model: aiProvider.client(aiProvider.model),
      system:
        "Create a short title (3-6 words) for a customer support conversation that starts with the given message. " +
        "Reply with the title only — no quotes, no punctuation at the end.",
      prompt: content,
      maxTokens: 16,
      temperature: 0,
    });

    const title = result.text.trim().replace(/^["']|["']$/g, "").slice(0, 80);
    return title || fallback;
  } catch (error) {
    console.error("Title generation failed, using fallback:", error);
    return fallback;
  }
}
