import { NextRequest, NextResponse } from "next/server";
import { reorderProjectsSchema } from "@/src/schemas/project";
import { reorderProjects } from "@/src/server/actions/projects";
import {
  createSuccessResponse,
  errorToResponse,
} from "@/src/server/create-response";
import { parseRequest, readJsonBody } from "@/src/server/parse-request";
import { requireUser } from "@/src/server/session";

// Collection-level action (the static segment wins over [projectId]):
// persists the caller's manual page order and returns the reordered list.
const POST = async (request: NextRequest) => {
  try {
    const { user } = await requireUser();
    const body = parseRequest(reorderProjectsSchema, await readJsonBody(request));
    const { data } = await reorderProjects({ userId: user.id, ...body });
    return NextResponse.json(createSuccessResponse({ data }), { status: 200 });
  } catch (error) {
    return errorToResponse(error);
  }
};

export { POST };
