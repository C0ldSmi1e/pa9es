import { z } from "zod";
import { BadRequestError } from "@/src/server/errors";

// Parses request input (body or query params) with a zod schema; the first
// validation issue becomes a BadRequestError → 400.
const parseRequest = <T>(schema: z.ZodType<T>, input: unknown): T => {
  const result = schema.safeParse(input);
  if (!result.success) {
    const issue = result.error.issues[0];
    const path = issue.path.length > 0 ? `${issue.path.join(".")}: ` : "";
    throw new BadRequestError(`${path}${issue.message}`);
  }
  return result.data;
};

// request.json() with malformed JSON mapped to a 400 instead of a 500.
const readJsonBody = async (request: Request): Promise<unknown> => {
  try {
    return await request.json();
  } catch {
    throw new BadRequestError("Invalid JSON body");
  }
};

export { parseRequest, readJsonBody };
