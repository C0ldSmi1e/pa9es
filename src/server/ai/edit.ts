import { streamText } from "ai";
import { ai } from "@/src/config/constants";
import { findOwnedProject } from "@/src/server/actions/projects";
import { anthropic } from "@/src/server/ai/provider";
import { assertWithinAiRateLimit } from "@/src/server/ai/rate-limit";
import { BadRequestError } from "@/src/server/errors";

const SYSTEM_PROMPT =
  "You edit a single-file HTML page for the user. Apply their instruction " +
  "and return the COMPLETE updated HTML document — your output replaces the " +
  "whole file, so include every part the page needs. Keep everything the " +
  "instruction doesn't ask to change. If the current page is empty, create " +
  "the page the instruction describes: self-contained HTML with inline CSS " +
  "and JS, responsive, no external dependencies unless asked for. Output " +
  "raw HTML only — no markdown fences, no commentary.";

// Streams a rewritten draft for the project. The route turns the result
// into a raw text response; the client adopts the final text as the draft
// (after its snapshot commit — this never writes the DB itself).
const editDraft = async ({
  userId,
  projectId,
  instruction,
}: {
  userId: string;
  projectId: string;
  instruction: string;
}): Promise<ReadableStream<Uint8Array>> => {
  assertWithinAiRateLimit({ userId, action: "edit" });

  const owned = await findOwnedProject({ userId, projectId });
  if (Buffer.byteLength(owned.draftHtml, "utf8") > ai.edit.maxDraftBytes) {
    throw new BadRequestError(
      `Draft is too large for AI editing (max ${ai.edit.maxDraftBytes / 1024} KB)`,
    );
  }

  const result = streamText({
    model: anthropic(ai.models.edit),
    system: SYSTEM_PROMPT,
    prompt: [
      `Instruction: ${instruction}`,
      "",
      "Current page HTML:",
      owned.draftHtml === "" ? "(empty — create the page)" : owned.draftHtml,
    ].join("\n"),
  });

  // Raw text bytes with real error propagation: an AI failure mid-stream
  // must abort the response so the client restores the pre-edit draft —
  // the SDK's toTextStreamResponse drops error parts and ends "cleanly",
  // which would let a truncated page get adopted as the draft.
  const encoder = new TextEncoder();
  return new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        for await (const part of result.fullStream) {
          if (part.type === "text-delta") {
            controller.enqueue(encoder.encode(part.text));
          } else if (part.type === "error") {
            throw part.error;
          }
        }
        controller.close();
      } catch (error) {
        console.error("editDraft: AI stream failed", error);
        controller.error(new Error("AI stream failed"));
      }
    },
  });
};

export { editDraft };
