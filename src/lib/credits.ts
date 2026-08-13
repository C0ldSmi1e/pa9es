import { credits } from "@/src/config/constants";

// Formats internal units as a display amount: 100 → "1", -150 → "-1.5".
const formatCredits = (units: number): string => {
  const value = units / credits.scale;
  return Number.isInteger(value)
    ? String(value)
    : value.toFixed(2).replace(/0$/, "");
};

// "1 credit" / "2.5 credits" — for prose like error messages and price hints.
const formatCreditAmount = (units: number): string => {
  const formatted = formatCredits(units);
  return `${formatted} credit${formatted === "1" || formatted === "-1" ? "" : "s"}`;
};

// Ledger kinds are an open set; unknown ones fall back to the raw kind with
// underscores spaced so future kinds render acceptably without a release.
const KIND_LABELS: Record<string, string> = {
  signup_bonus: "signup bonus",
  publish_charge: "publish",
  admin_adjustment: "adjustment",
  referral_bonus: "referral",
  purchase: "purchase",
  ai_usage: "ai",
};

const ledgerKindLabel = (kind: string): string =>
  KIND_LABELS[kind] ?? kind.replaceAll("_", " ");

export { formatCredits, formatCreditAmount, ledgerKindLabel };
