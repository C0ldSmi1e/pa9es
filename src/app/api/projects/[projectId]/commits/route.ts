import { NextRequest, NextResponse } from "next/server";
import { createCommitSchema } from "@/src/schemas/project";
import { createCommit, listCommits } from "@/src/server/actions/commits";
import {
  createSuccessResponse,
  errorToResponse,
} from "@/src/server/create-response";
import { parseRequest, readJsonBody } from "@/src/server/parse-request";
import { requireUser } from "@/src/server/session";

type RouteContext = { params: Promise<{ projectId: string }> };

const GET = async (_request: NextRequest, { params }: RouteContext) => {
  try {
    const { user } = await requireUser();
    const { projectId } = await params;
    const data = await listCommits({ userId: user.id, projectId });
    return NextResponse.json(createSuccessResponse({ data }), { status: 200 });
  } catch (error) {
    return errorToResponse(error);
  }
};

const POST = async (request: NextRequest, { params }: RouteContext) => {
  try {
    const { user } = await requireUser();
    const { projectId } = await params;
    const body = parseRequest(createCommitSchema, await readJsonBody(request));
    const data = await createCommit({ userId: user.id, projectId, ...body });
    return NextResponse.json(createSuccessResponse({ data }), { status: 201 });
  } catch (error) {
    return errorToResponse(error);
  }
};

export { GET, POST };
