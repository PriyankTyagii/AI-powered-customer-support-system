import { generateText, type CoreMessage } from "ai";
import { aiProvider } from "./ai-provider";

export type HistoryMessage = {
  role: "user" | "assistant";
  content: string;
};

/** Order/invoice/tracking reference numbers. */
const REF_PATTERN = /\b(?:ORD|INV|TRK)-[A-Z0-9]+\b/gi;

/**
 * The draft answer is computed from real database queries and is the source
 * of truth. The reply may only contain reference numbers that appear in the
 * draft or the user's own message — anything else means the model pulled a
 * number from conversation history and the reply cannot be trusted.
 */
function referencesAreValid(reply: string, draft: string, userMessage: string) {
  const allowed = new Set(
    [...`${draft} ${userMessage}`.matchAll(REF_PATTERN)].map((m) => m[0].toUpperCase()),
  );
  return [...reply.matchAll(REF_PATTERN)].every((m) => allowed.has(m[0].toUpperCase()));
}

export class AiStreamService {
  async *streamResponse(input: {
    response: string;
    reasoning: string;
    userMessage?: string;
    history?: HistoryMessage[];
  }) {
    let reply = input.response;

    if (aiProvider) {
      try {
        // Prior turns give continuity for follow-ups; the final turn contains
        // the actual user message plus the authoritative draft.
        const messages: CoreMessage[] = [
          ...(input.history ?? []).map((message) => ({
            role: message.role,
            content: message.content,
          })),
          {
            role: "user" as const,
            content: [
              input.userMessage ? `User message: ${input.userMessage}` : undefined,
              `Reasoning context: ${input.reasoning}`,
              `Draft answer (authoritative facts): ${input.response}`,
            ]
              .filter(Boolean)
              .join("\n"),
          },
        ];

        const result = await generateText({
          model: aiProvider.client(aiProvider.model),
          system:
            "You are a customer support AI. Rewrite the draft answer into a concise, friendly reply to the user's message. " +
            "The draft answer contains the authoritative facts for this turn. Copy every order number, invoice number, " +
            "tracking number, and amount from the draft EXACTLY — never reuse reference numbers from earlier in the " +
            "conversation. Do not invent details beyond the draft.",
          messages,
        });

        const candidate = result.text.trim();

        // Deterministic guards: discard the rewrite if the model swapped in a
        // reference number from history, or dropped a UI link ([...](#...))
        // the draft relies on (e.g. the "visit the Store" deep link).
        const draftHasLink = /\[[^\]]+\]\(#[^)]+\)/.test(input.response);
        const candidateHasLink = /\[[^\]]+\]\(#[^)]+\)/.test(candidate);

        if (
          candidate &&
          referencesAreValid(candidate, input.response, input.userMessage ?? "") &&
          (!draftHasLink || candidateHasLink)
        ) {
          reply = candidate;
        } else if (candidate) {
          console.warn("AI reply failed reference/link validation; using draft instead.");
        }
      } catch (error) {
        console.error("AI generation failed, falling back to draft response:", error);
      }
    }

    // Stream the validated reply to the client in small chunks.
    for (const chunk of reply.split(" ")) {
      yield `${chunk} `;
    }
  }
}
