import { z } from "zod";
import { ai } from "@/src/config/constants";

const aiEditSchema = z.object({
  instruction: z
    .string()
    .trim()
    .min(1, "Instruction required")
    .max(ai.edit.maxInstructionChars),
});

export { aiEditSchema };
