import { NextRequest, NextResponse } from "next/server";
import { commitRefSchema } from "@/src/schemas/project";
import { makeLive, unpublish } from "@/src/server/actions/commits";
import {
  createSuccessResponse,
  errorToResponse,
} from "@/src/server/create-response";
import { parseRequest, readJsonBody } from "@/src/server/parse-request";
import { requireUser } from "@/src/server/session";

type RouteContext = { params: Promise<{ projectId: string }> };

// Production is a commit: POST points the live pointer at one, DELETE clears
// it (unpublish).
const POST = async (request: NextRequest, { params }: RouteContext) => {
  try {
    const { user } = await requireUser();
    const { projectId } = await params;
    const body = parseRequest(commitRefSchema, await readJsonBody(request));
    const data = await makeLive({ userId: user.id, projectId, ...body });
    return NextResponse.json(createSuccessResponse({ data }), { status: 200 });
  } catch (error) {
    return errorToResponse(error);
  }
};

const DELETE = async (_request: NextRequest, { params }: RouteContext) => {
  try {
    const { user } = await requireUser();
    const { projectId } = await params;
    const data = await unpublish({ userId: user.id, projectId });
    return NextResponse.json(createSuccessResponse({ data }), { status: 200 });
  } catch (error) {
    return errorToResponse(error);
  }
};

export { POST, DELETE };
