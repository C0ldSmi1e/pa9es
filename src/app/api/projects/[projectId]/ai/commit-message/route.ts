import { NextRequest, NextResponse } from "next/server";
import { suggestCommitMessage } from "@/src/server/ai/commit-message";
import {
  createSuccessResponse,
  errorToResponse,
} from "@/src/server/create-response";
import { requireUser } from "@/src/server/session";

type RouteContext = { params: Promise<{ projectId: string }> };

// Suggests a commit message for the current server-side draft. No body —
// the draft is the input; the editor flushes its autosave first.
const POST = async (_request: NextRequest, { params }: RouteContext) => {
  try {
    const { user } = await requireUser();
    const { projectId } = await params;
    const data = await suggestCommitMessage({ userId: user.id, projectId });
    return NextResponse.json(createSuccessResponse({ data }), { status: 200 });
  } catch (error) {
    return errorToResponse(error);
  }
};

export { POST };
