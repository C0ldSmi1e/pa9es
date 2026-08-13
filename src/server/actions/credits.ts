import { and, count, desc, eq, gte, sql } from "drizzle-orm";
import { pagination as paginationConfig } from "@/src/config/constants";
import type { LedgerEntry } from "@/src/schemas/credits";
import type { ListResult, Pagination } from "@/src/schemas/standard-response";
import { db } from "@/src/server/db";
import { creditLedger, user, type CreditLedgerEntry } from "@/src/server/db/schema";
import { isUniqueViolation, PaymentRequiredError } from "@/src/server/errors";
import { formatCreditAmount } from "@/src/lib/credits";

// The ledger invariant: every entry is paired with a balance update in the
// same transaction, and entries are never edited — corrections are
// compensating entries. bun-sqlite is a synchronous driver, so everything
// here uses drizzle's sync execution (.get()/.run()) inside db.transaction;
// an async callback would let the transaction commit before its work ran.

// A transaction handle when composing with other writes (makeLive), or db
// itself when standing alone.
type DbClient = typeof db | Parameters<Parameters<typeof db.transaction>[0]>[0];

type EntryArgs = {
  userId: string;
  // Signed, internal units.
  delta: number;
  kind: string;
  // At most one entry ever exists per (kind, refId) — replays are no-ops.
  refId?: string;
  note?: string;
  projectId?: string;
};

// Inserts one ledger row; null when (kind, refId) already exists. SQLite
// rolls back only the failed statement, so catching here keeps the enclosing
// transaction alive.
const insertEntry = (
  dbc: DbClient,
  { userId, delta, kind, refId, note, projectId }: EntryArgs,
): CreditLedgerEntry | null => {
  if (!Number.isInteger(delta) || delta === 0) {
    throw new Error(`credit entry delta must be a non-zero integer, got ${delta}`);
  }
  try {
    return dbc
      .insert(creditLedger)
      .values({ userId, delta, kind, refId, note, projectId })
      .returning()
      .get();
  } catch (error) {
    if (isUniqueViolation(error)) {
      return null;
    }
    throw error;
  }
};

// Credits (or debits, for signed admin adjustments) without a balance floor.
// Returns null when the (kind, refId) grant already happened.
const grantCredits = (
  args: { amount: number } & Omit<EntryArgs, "delta">,
  tx?: DbClient,
): CreditLedgerEntry | null => {
  const run = (dbc: DbClient): CreditLedgerEntry | null => {
    const entry = insertEntry(dbc, { ...args, delta: args.amount });
    if (!entry) {
      return null;
    }
    dbc
      .update(user)
      .set({ creditBalance: sql`${user.creditBalance} + ${args.amount}` })
      .where(eq(user.id, args.userId))
      .run();
    return entry;
  };
  return tx ? run(tx) : db.transaction(run);
};

// Charges `amount` (positive) if the balance covers it; throws
// PaymentRequiredError otherwise. Entry goes in first so a keyed replay
// short-circuits to null (already charged — the caller's action already
// happened once and was paid for); an insufficient balance then rolls the
// entry back with the transaction.
const spendCredits = (
  args: { amount: number } & Omit<EntryArgs, "delta">,
  tx?: DbClient,
): CreditLedgerEntry | null => {
  if (args.amount <= 0) {
    throw new Error(`spendCredits amount must be positive, got ${args.amount}`);
  }
  const run = (dbc: DbClient): CreditLedgerEntry | null => {
    const entry = insertEntry(dbc, { ...args, delta: -args.amount });
    if (!entry) {
      return null;
    }
    const updated = dbc
      .update(user)
      .set({ creditBalance: sql`${user.creditBalance} - ${args.amount}` })
      .where(and(eq(user.id, args.userId), gte(user.creditBalance, args.amount)))
      .returning({ balance: user.creditBalance })
      .get();
    if (!updated) {
      throw new PaymentRequiredError(
        `Not enough credits — this costs ${formatCreditAmount(args.amount)}`,
      );
    }
    return entry;
  };
  return tx ? run(tx) : db.transaction(run);
};

const getBalance = async ({
  userId,
}: {
  userId: string;
}): Promise<{ balance: number }> => {
  const [row] = await db
    .select({ balance: user.creditBalance })
    .from(user)
    .where(eq(user.id, userId))
    .limit(1);
  // Callers hold a session, so the user row exists.
  return { balance: row?.balance ?? 0 };
};

const toEntry = (row: CreditLedgerEntry): LedgerEntry => ({
  id: row.id,
  delta: row.delta,
  kind: row.kind,
  note: row.note,
  projectId: row.projectId,
  createdAt: row.createdAt.toISOString(),
});

const listLedger = async ({
  userId,
  offset,
  limit,
}: {
  userId: string;
  offset?: number;
  limit?: number;
}): Promise<ListResult<LedgerEntry>> => {
  // Per API convention: no pagination params → everything, hard-capped.
  const paginated = offset !== undefined || limit !== undefined;
  const effectiveOffset = offset ?? paginationConfig.defaultOffset;
  const effectiveLimit = paginated
    ? (limit ?? paginationConfig.defaultLimit)
    : paginationConfig.maxLimit;

  const rows = await db
    .select()
    .from(creditLedger)
    .where(eq(creditLedger.userId, userId))
    .orderBy(desc(creditLedger.createdAt))
    .limit(effectiveLimit)
    .offset(effectiveOffset);

  const data = rows.map(toEntry);

  let pagination: Pagination | null = null;
  if (paginated) {
    const [{ total }] = await db
      .select({ total: count() })
      .from(creditLedger)
      .where(eq(creditLedger.userId, userId));
    pagination = {
      offset: effectiveOffset,
      limit: effectiveLimit,
      total,
      hasMore: effectiveOffset + rows.length < total,
    };
  }

  return { data, pagination };
};

export { grantCredits, spendCredits, getBalance, listLedger };
