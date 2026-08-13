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

// All credit amounts are integers in internal units: `scale` units = 1
// displayed credit, so fractional prices (future AI metering) never need
// schema changes. Prices are tunable here and only here — the ledger
// records amounts as charged at the time.
export const credits = {
  scale: 100,
  // Granted once per account (ledger-keyed on the user id).
  signupBonus: 300,
  // Charged the first time a project goes live (ledger-keyed on the
  // project id, so republish and rollback stay free).
  publishCost: 100,
};
