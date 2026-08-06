// Domain errors thrown by actions. Each names the *kind* of failure rather
// than a transport-level status code — actions don't know about HTTP. The
// route layer maps these to HTTP statuses via errorToResponse, which lives
// alongside the other response helpers in src/utils/create-response.ts.
//
// Anything not listed here — DB outage, programming bug, library exception —
// bubbles up as a generic 500.

// Business-rule violation or semantic input issue. The request is well-formed
// but cannot be satisfied given the current state or invariants.
// Examples: "Cannot demote the last admin", "endTime must be after startTime",
// "Cannot connect with yourself", "Current password is incorrect".
class BadRequestError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "BadRequestError";
  }
}

// Caller is not authenticated. No credentials, or credentials are invalid /
// expired. Typically thrown by requireAuth when an unauthenticated request
// reaches a protected route.
class AuthenticationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AuthenticationError";
  }
}

// Caller is authenticated but lacks permission for the requested action. The
// client should NOT retry with the same credentials.
// Examples: a non-admin trying to mutate event settings, a non-attendee
// hitting an attendee-only endpoint.
class AuthorizationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AuthorizationError";
  }
}

// The referenced resource doesn't exist (or isn't visible to this caller).
// Lookup by id / slug returned nothing.
// Examples: "Attendee not found", "Invitation not found".
class NotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "NotFoundError";
  }
}

// State-based conflict. A unique constraint would be violated, or the entity
// is already in the target state.
// Examples: "Slug already exists", "Person is already a member of this event",
// "Invitation already accepted", "Already onboarded".
class ConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ConflictError";
  }
}

// Caller is within a cooldown window for this endpoint or resource. Carries
// retryAfterSec so the route can populate the standard Retry-After header.
class RateLimitError extends Error {
  constructor(public retryAfterSec: number) {
    super(`Please wait ${retryAfterSec}s before retrying`);
    this.name = "RateLimitError";
  }
}

// An upstream service the action depended on (email provider, third-party
// API) failed. The action's own state is fine; the caller may retry.
// Examples: "Failed to send invite email".
class UpstreamError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "UpstreamError";
  }
}

// Walks the `cause` chain for a Postgres SQLSTATE: drizzle wraps driver
// errors in DrizzleQueryError, so the code lives on the wrapped original.
const hasSqlState = (error: unknown, code: string): boolean => {
  let current: unknown = error;
  while (current instanceof Error) {
    if ("code" in current && (current as { code?: string }).code === code) {
      return true;
    }
    current = current.cause;
  }
  return false;
};

// Postgres unique-constraint violation (SQLSTATE 23505). Lets an action map a
// uniqueness race that slipped past a pre-check to a ConflictError, not a 500.
const isUniqueViolation = (error: unknown): boolean => hasSqlState(error, "23505");

// Postgres foreign-key violation (SQLSTATE 23503). Lets a check-then-delete
// action map a reference that appeared between the check and the delete to
// the same ConflictError its pre-check would have thrown.
const isForeignKeyViolation = (error: unknown): boolean =>
  hasSqlState(error, "23503");

export {
  BadRequestError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  ConflictError,
  RateLimitError,
  UpstreamError,
  isUniqueViolation,
  isForeignKeyViolation,
};
