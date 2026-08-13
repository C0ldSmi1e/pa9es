// Client-safe constants. This module is imported from both server and
// browser code — it must never read process.env or import server modules
// (env-derived config lives in src/server/env.ts).

export const pagination = {
  defaultLimit: 10,
  defaultOffset: 0,
  maxLimit: 1000,
};

export const content = {
  maxHtmlBytes: 1024 * 1024,
};
