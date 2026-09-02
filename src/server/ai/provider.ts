import "server-only";
import { createAnthropic } from "@ai-sdk/anthropic";
import { aiConfig } from "@/src/server/env";

// Single home for the AI SDK provider. Features pick their model id from
// `ai.models` in src/config/constants.ts and pass it to this.
const anthropic = createAnthropic({ apiKey: aiConfig.apiKey });

export { anthropic };
