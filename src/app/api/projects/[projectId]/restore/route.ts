import { NextRequest, NextResponse } from "next/server";
import { commitRefSchema } from "@/src/schemas/project";
import { restoreDraft } from "@/src/server/actions/commits";
import {
  createSuccessResponse,
  errorToResponse,
} from "@/src/server/create-response";
import { parseRequest, readJsonBody } from "@/src/server/parse-request";
import { requireUser } from "@/src/server/session";

type RouteContext = { params: Promise<{ projectId: string }> };

// Overwrites the draft with a commit's html; the client confirms first when
// uncommitted changes would be lost.
const POST = async (request: NextRequest, { params }: RouteContext) => {
  try {
    const { user } = await requireUser();
    const { projectId } = await params;
    const body = parseRequest(commitRefSchema, await readJsonBody(request));
    const data = await restoreDraft({ userId: user.id, projectId, ...body });
    return NextResponse.json(createSuccessResponse({ data }), { status: 200 });
  } catch (error) {
    return errorToResponse(error);
  }
};

export { POST };
