import { NextRequest, NextResponse } from "next/server";
import { adminAdjustCreditsSchema } from "@/src/schemas/credits";
import { getBalance, grantCredits } from "@/src/server/actions/credits";
import {
  createSuccessResponse,
  errorToResponse,
} from "@/src/server/create-response";
import { isForeignKeyViolation, NotFoundError } from "@/src/server/errors";
import { parseRequest, readJsonBody } from "@/src/server/parse-request";
import { requireAdmin } from "@/src/server/session";

// Admin grant/deduct: a signed admin_adjustment ledger entry. Unkeyed on
// purpose — each call is a deliberate, distinct adjustment. Clawbacks are
// negative amounts, not edits.
const POST = async (request: NextRequest) => {
  try {
    await requireAdmin();
    const body = parseRequest(adminAdjustCreditsSchema, await readJsonBody(request));
    try {
      grantCredits({
        userId: body.userId,
        amount: body.amount,
        kind: "admin_adjustment",
        note: body.note,
      });
    } catch (error) {
      // The ledger FK is the existence check.
      if (isForeignKeyViolation(error)) {
        throw new NotFoundError("User not found");
      }
      throw error;
    }
    const data = await getBalance({ userId: body.userId });
    return NextResponse.json(createSuccessResponse({ data }), { status: 200 });
  } catch (error) {
    return errorToResponse(error);
  }
};

export { POST };
