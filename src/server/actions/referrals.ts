import { and, count, eq, sql } from "drizzle-orm";
import { referrals } from "@/src/config/constants";
import { grantCredits, type DbClient } from "@/src/server/actions/credits";
import { db } from "@/src/server/db";
import { creditLedger, user } from "@/src/server/db/schema";

// The referrer side of a referral: pays out when a referee publishes.
// Called from makeLive inside its transaction on every go-live — cheap
// (one pk read, usually a null referredBy), and the ledger key
// (referral_reward, refereeId) makes it once-per-referee-ever without any
// state machine. Sync like the rest of the ledger writes.
const maybeRewardReferrer = (refereeId: string, tx: DbClient): void => {
  const referee = tx
    .select({ referredBy: user.referredBy, username: user.username })
    .from(user)
    .where(eq(user.id, refereeId))
    .get();
  const referrerId = referee?.referredBy;
  if (!referrerId) {
    return;
  }
  // Lifetime cap per referrer. Count + insert are race-free here: the
  // driver is sync and single-writer, so the transaction can't interleave.
  const rewarded = tx
    .select({ n: count() })
    .from(creditLedger)
    .where(
      and(
        eq(creditLedger.userId, referrerId),
        eq(creditLedger.kind, "referral_reward"),
      ),
    )
    .get();
  if ((rewarded?.n ?? 0) >= referrals.maxRewards) {
    return;
  }
  grantCredits(
    {
      userId: referrerId,
      amount: referrals.referrerBonus,
      kind: "referral_reward",
      refId: refereeId,
      note: referee?.username ? `referee ${referee.username}` : undefined,
    },
    tx,
  );
};

// Settings-page numbers: how many accounts this user referred, and what the
// rewards added up to.
const referralStats = async ({
  userId,
}: {
  userId: string;
}): Promise<{ signups: number; rewarded: number; earned: number }> => {
  const [signupsRow] = await db
    .select({ n: count() })
    .from(user)
    .where(eq(user.referredBy, userId));
  const [rewardsRow] = await db
    .select({
      n: count(),
      earned: sql<number>`coalesce(sum(${creditLedger.delta}), 0)`,
    })
    .from(creditLedger)
    .where(
      and(eq(creditLedger.userId, userId), eq(creditLedger.kind, "referral_reward")),
    );
  return {
    signups: signupsRow?.n ?? 0,
    rewarded: rewardsRow?.n ?? 0,
    earned: rewardsRow?.earned ?? 0,
  };
};

export { maybeRewardReferrer, referralStats };
