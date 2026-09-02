import { NextRequest } from "next/server";
import { aiEditSchema } from "@/src/schemas/ai";
import { editDraft } from "@/src/server/ai/edit";
import { errorToResponse } from "@/src/server/create-response";
import { parseRequest, readJsonBody } from "@/src/server/parse-request";
import { requireUser } from "@/src/server/session";

type RouteContext = { params: Promise<{ projectId: string }> };

// The one streaming endpoint (docs/ai-features.md): raw text chunks of the
// rewritten draft, not the standard envelope. Pre-stream failures (auth,
// rate limit, validation) still return the envelope via errorToResponse.
const POST = async (request: NextRequest, { params }: RouteContext) => {
  try {
    const { user } = await requireUser();
    const { projectId } = await params;
    const body = parseRequest(aiEditSchema, await readJsonBody(request));
    const stream = await editDraft({ userId: user.id, projectId, ...body });
    return new Response(stream, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-cache",
      },
    });
  } catch (error) {
    return errorToResponse(error);
  }
};

export { POST };
