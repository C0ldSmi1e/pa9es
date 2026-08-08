import { NextRequest, NextResponse } from "next/server";
import { getCommit } from "@/src/server/actions/commits";
import {
  createSuccessResponse,
  errorToResponse,
} from "@/src/server/create-response";
import { requireUser } from "@/src/server/session";

type RouteContext = { params: Promise<{ projectId: string; commitId: string }> };

const GET = async (_request: NextRequest, { params }: RouteContext) => {
  try {
    const { user } = await requireUser();
    const { projectId, commitId } = await params;
    const data = await getCommit({ userId: user.id, projectId, commitId });
    return NextResponse.json(createSuccessResponse({ data }), { status: 200 });
  } catch (error) {
    return errorToResponse(error);
  }
};

export { GET };
