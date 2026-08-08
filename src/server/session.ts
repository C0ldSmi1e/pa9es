import { headers } from "next/headers";
import { auth } from "@/src/server/auth";
import { AuthenticationError, AuthorizationError } from "@/src/server/errors";

// Current session ({ session, user }), or null when unauthenticated.
const getSession = async () => {
  return auth.api.getSession({ headers: await headers() });
};

// Session of the signed-in caller; AuthenticationError (401) otherwise.
const requireUser = async () => {
  const session = await getSession();
  if (!session) {
    throw new AuthenticationError("You must be signed in");
  }
  return session;
};

// Session of a signed-in admin; AuthorizationError (403) for non-admins.
const requireAdmin = async () => {
  const session = await requireUser();
  if (session.user.role !== "admin") {
    throw new AuthorizationError("Admin access required");
  }
  return session;
};

export { getSession, requireUser, requireAdmin };
