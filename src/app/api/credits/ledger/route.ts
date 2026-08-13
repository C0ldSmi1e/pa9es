import { NextRequest, NextResponse } from "next/server";
import { paginationQuerySchema } from "@/src/schemas/standard-response";
import { listLedger } from "@/src/server/actions/credits";
import {
  createSuccessResponse,
  errorToResponse,
} from "@/src/server/create-response";
import { parseRequest } from "@/src/server/parse-request";
import { requireUser } from "@/src/server/session";

const GET = async (request: NextRequest) => {
  try {
    const { user } = await requireUser();
    const query = parseRequest(
      paginationQuerySchema,
      Object.fromEntries(request.nextUrl.searchParams),
    );
    const { data, pagination } = await listLedger({ userId: user.id, ...query });
    return NextResponse.json(createSuccessResponse({ data, pagination }), {
      status: 200,
    });
  } catch (error) {
    return errorToResponse(error);
  }
};

export { GET };
