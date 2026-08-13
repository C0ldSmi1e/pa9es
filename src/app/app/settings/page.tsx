import Link from "next/link";
import { redirect } from "next/navigation";
import { credits, referrals } from "@/src/config/constants";
import {
  formatCredits,
  formatCreditAmount,
  ledgerKindLabel,
} from "@/src/lib/credits";
import { ChangePasswordForm } from "@/src/components/auth/change-password-form";
import { ReferralLink } from "@/src/components/referral-link";
import { getBalance, listLedger } from "@/src/server/actions/credits";
import { referralStats } from "@/src/server/actions/referrals";
import { authConfig } from "@/src/server/env";
import { getSession } from "@/src/server/session";

// Account settings. Password only for now; profile/email updates land here
// later (see docs/system-overview.md future list).
const SettingsPage = async () => {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }

  const { balance } = await getBalance({ userId: session.user.id });
  const { data: entries } = await listLedger({
    userId: session.user.id,
    offset: 0,
    limit: 10,
  });
  const stats = await referralStats({ userId: session.user.id });

  // ?ref= on the canonical origin; ReferralCapture picks it up on landing.
  const referralUrl = new URL(authConfig.url);
  if (session.user.username) {
    referralUrl.searchParams.set("ref", session.user.username);
  }

  return (
    <main className="min-h-screen bg-ground font-sans">
      <div className="mx-auto max-w-lg space-y-5 px-6 py-8">
        <header className="flex items-baseline justify-between border-b border-edge pb-4">
          <h1 className="text-lg font-semibold tracking-tight text-ink">Settings</h1>
          <Link
            href="/app"
            className="text-sm text-dim transition-colors hover:text-ink"
          >
            ← Pages
          </Link>
        </header>

        <section className="rounded-xl border border-edge bg-panel p-5">
          <h2 className="font-mono text-[11px] uppercase tracking-[0.1em] text-dim">
            Account
          </h2>
          <dl className="mt-3 space-y-1.5">
            <div className="flex items-baseline justify-between text-sm">
              <dt className="text-dim">username</dt>
              <dd className="font-mono text-xs text-ink">
                {session.user.username ?? "—"}
              </dd>
            </div>
            <div className="flex items-baseline justify-between text-sm">
              <dt className="text-dim">email</dt>
              <dd className="font-mono text-xs text-ink">{session.user.email}</dd>
            </div>
          </dl>
        </section>

        <section className="rounded-xl border border-edge bg-panel p-5">
          <div className="flex items-baseline justify-between">
            <h2 className="font-mono text-[11px] uppercase tracking-[0.1em] text-dim">
              Credits
            </h2>
            <span className="font-mono text-sm font-semibold text-ink">
              {formatCredits(balance)}
            </span>
          </div>
          {entries.length > 0 && (
            <ul className="mt-3 space-y-1.5">
              {entries.map((entry) => (
                <li
                  key={entry.id}
                  className="flex items-baseline justify-between gap-3 text-sm"
                >
                  <span className="min-w-0 truncate text-dim">
                    {ledgerKindLabel(entry.kind)}
                    {entry.note && (
                      <span className="text-faint"> · {entry.note}</span>
                    )}
                  </span>
                  <span className="flex shrink-0 items-baseline gap-2.5">
                    <span className="font-mono text-[11px] text-faint">
                      {entry.createdAt.slice(0, 10)}
                    </span>
                    <span
                      className={`font-mono text-xs ${
                        entry.delta > 0 ? "text-live" : "text-ink"
                      }`}
                    >
                      {entry.delta > 0 ? "+" : ""}
                      {formatCredits(entry.delta)}
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          )}
          <p className="mt-4 text-xs text-faint">
            Publishing a page for the first time costs{" "}
            {formatCreditAmount(credits.publishCost)}. Republishing and rollbacks are
            free.
          </p>
        </section>

        {session.user.username && (
          <section className="rounded-xl border border-edge bg-panel p-5">
            <div className="flex items-baseline justify-between">
              <h2 className="font-mono text-[11px] uppercase tracking-[0.1em] text-dim">
                Referrals
              </h2>
              <span className="font-mono text-xs text-dim">
                {stats.signups} signed up · {stats.rewarded} published · earned{" "}
                {formatCredits(stats.earned)}
              </span>
            </div>
            <div className="mt-3">
              <ReferralLink url={referralUrl.toString()} />
            </div>
            <p className="mt-4 text-xs text-faint">
              Friends who sign up with your link get{" "}
              {formatCreditAmount(referrals.refereeBonus)} extra. You earn{" "}
              {formatCreditAmount(referrals.referrerBonus)} when they publish their
              first page.
            </p>
          </section>
        )}

        <section className="rounded-xl border border-edge bg-panel p-5">
          <h2 className="font-mono text-[11px] uppercase tracking-[0.1em] text-dim">
            Change password
          </h2>
          <div className="mt-4">
            <ChangePasswordForm />
          </div>
          <p className="mt-4 text-xs text-faint">
            Changing your password signs you out everywhere except this browser.
          </p>
        </section>
      </div>
    </main>
  );
};

export default SettingsPage;
