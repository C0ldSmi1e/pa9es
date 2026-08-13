import { NextRequest, NextResponse } from "next/server";
import { getBalance } from "@/src/server/actions/credits";
import {
  createSuccessResponse,
  errorToResponse,
} from "@/src/server/create-response";
import { requireUser } from "@/src/server/session";

// Balance is internal units (see `credits` in src/config/constants.ts);
// the entry history lives at /api/credits/ledger.
const GET = async (_request: NextRequest) => {
  try {
    const { user } = await requireUser();
    const data = await getBalance({ userId: user.id });
    return NextResponse.json(createSuccessResponse({ data }), { status: 200 });
  } catch (error) {
    return errorToResponse(error);
  }
};

export { GET };
