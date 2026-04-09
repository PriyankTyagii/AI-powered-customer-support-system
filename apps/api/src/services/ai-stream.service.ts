import { openai } from "@ai-sdk/openai";
import { streamText } from "ai";

export class AiStreamService {
  async *streamResponse(input: { response: string; reasoning: string }) {
    if (process.env.OPENAI_API_KEY) {
      const result = streamText({
        model: openai("gpt-4o-mini"),
        system:
          "You are a customer support AI. Respond with concise and accurate answers. Keep context and keep a helpful tone.",
        prompt: `Reasoning context: ${input.reasoning}\nDraft answer: ${input.response}`,
      });

      for await (const chunk of result.textStream) {
        yield chunk;
      }
      return;
    }

    const chunks = input.response.split(" ");
    for (const chunk of chunks) {
      yield `${chunk} `;
    }
  }
}
