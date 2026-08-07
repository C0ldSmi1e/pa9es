import { NextRequest, NextResponse } from "next/server";
import { createProject, listProjects } from "@/src/actions/projects";
import { createProjectSchema } from "@/src/schemas/project";
import { paginationQuerySchema } from "@/src/schemas/standard-response";
import { createSuccessResponse, errorToResponse } from "@/src/utils/create-response";
import { parseRequest, readJsonBody } from "@/src/utils/parse-request";
import { requireUser } from "@/src/utils/session";

const GET = async (request: NextRequest) => {
  try {
    const { user } = await requireUser();
    const query = parseRequest(
      paginationQuerySchema,
      Object.fromEntries(request.nextUrl.searchParams),
    );
    const { data, pagination } = await listProjects({ userId: user.id, ...query });
    return NextResponse.json(createSuccessResponse({ data, pagination }), {
      status: 200,
    });
  } catch (error) {
    return errorToResponse(error);
  }
};

const POST = async (request: NextRequest) => {
  try {
    const { user } = await requireUser();
    const body = parseRequest(createProjectSchema, await readJsonBody(request));
    const data = await createProject({ userId: user.id, ...body });
    return NextResponse.json(createSuccessResponse({ data }), { status: 201 });
  } catch (error) {
    return errorToResponse(error);
  }
};

export { GET, POST };
