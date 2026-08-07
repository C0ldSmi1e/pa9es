import { NextRequest, NextResponse } from "next/server";
import { publishProject, unpublishProject } from "@/src/actions/projects";
import { createSuccessResponse, errorToResponse } from "@/src/utils/create-response";
import { requireUser } from "@/src/utils/session";

type RouteContext = { params: Promise<{ projectId: string }> };

// Publication is modeled as a sub-resource: POST puts the page live,
// DELETE takes it down. Publish snapshots the current draft.
const POST = async (_request: NextRequest, { params }: RouteContext) => {
  try {
    const { user } = await requireUser();
    const { projectId } = await params;
    const data = await publishProject({ userId: user.id, projectId });
    return NextResponse.json(createSuccessResponse({ data }), { status: 200 });
  } catch (error) {
    return errorToResponse(error);
  }
};

const DELETE = async (_request: NextRequest, { params }: RouteContext) => {
  try {
    const { user } = await requireUser();
    const { projectId } = await params;
    const data = await unpublishProject({ userId: user.id, projectId });
    return NextResponse.json(createSuccessResponse({ data }), { status: 200 });
  } catch (error) {
    return errorToResponse(error);
  }
};

export { POST, DELETE };
