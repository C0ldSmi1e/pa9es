import { NextRequest, NextResponse } from "next/server";
import {
  deleteProject,
  getProject,
  updateProject,
} from "@/src/server/actions/projects";
import { updateProjectSchema } from "@/src/schemas/project";
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
    const data = await getProject({ userId: user.id, projectId });
    return NextResponse.json(createSuccessResponse({ data }), { status: 200 });
  } catch (error) {
    return errorToResponse(error);
  }
};

const PATCH = async (request: NextRequest, { params }: RouteContext) => {
  try {
    const { user } = await requireUser();
    const { projectId } = await params;
    const body = parseRequest(updateProjectSchema, await readJsonBody(request));
    const data = await updateProject({ userId: user.id, projectId, ...body });
    return NextResponse.json(createSuccessResponse({ data }), { status: 200 });
  } catch (error) {
    return errorToResponse(error);
  }
};

const DELETE = async (_request: NextRequest, { params }: RouteContext) => {
  try {
    const { user } = await requireUser();
    const { projectId } = await params;
    const data = await deleteProject({ userId: user.id, projectId });
    return NextResponse.json(createSuccessResponse({ data }), { status: 200 });
  } catch (error) {
    return errorToResponse(error);
  }
};

export { GET, PATCH, DELETE };
