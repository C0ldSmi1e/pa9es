import "server-only";
import { ai } from "@/src/config/constants";
import { RateLimitError } from "@/src/server/errors";

// Fixed-window in-memory limiter for the AI endpoints — the only usage
// guard while AI is free (docs/ai-features.md). In-memory is fine: the app
// is a single Bun process, and a restart resetting windows costs nothing.
type Bucket = { windowStart: number; count: number };

const buckets = new Map<string, Bucket>();

// Keeps the map from growing unboundedly across many users/actions.
const pruneExpired = (now: number): void => {
  for (const [key, bucket] of buckets) {
    if (now - bucket.windowStart >= ai.rateLimit.windowSec * 1000) {
      buckets.delete(key);
    }
  }
};

// Counts one request for `${action}:${userId}`; RateLimitError (429 with
// Retry-After) once the window's budget is spent.
const assertWithinAiRateLimit = ({
  userId,
  action,
}: {
  userId: string;
  action: string;
}): void => {
  const { windowSec, maxRequests } = ai.rateLimit;
  const now = Date.now();
  if (buckets.size > 5000) {
    pruneExpired(now);
  }

  const key = `${action}:${userId}`;
  const bucket = buckets.get(key);
  if (!bucket || now - bucket.windowStart >= windowSec * 1000) {
    buckets.set(key, { windowStart: now, count: 1 });
    return;
  }
  if (bucket.count >= maxRequests) {
    throw new RateLimitError(
      Math.ceil((bucket.windowStart + windowSec * 1000 - now) / 1000),
    );
  }
  bucket.count += 1;
};

export { assertWithinAiRateLimit };
