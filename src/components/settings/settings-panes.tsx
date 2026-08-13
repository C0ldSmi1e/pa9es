"use client";

import { useState } from "react";
import Link from "next/link";
import { credits, referrals } from "@/src/config/constants";
import { api } from "@/src/lib/api";
import {
  formatCredits,
  formatCreditAmount,
  ledgerKindLabel,
} from "@/src/lib/credits";
import type { LedgerEntry } from "@/src/schemas/credits";
import { ChangePasswordForm } from "@/src/components/auth/change-password-form";
import { ReferralLink } from "@/src/components/referral-link";

type SectionKey = "account" | "credits" | "referrals" | "security";

const LEDGER_PAGE_SIZE = 10;

const cardClass = "rounded-xl border border-edge bg-panel p-5";
const cardLabelClass = "font-mono text-[11px] uppercase tracking-[0.1em] text-dim";
const hintClass = "mt-4 text-xs leading-relaxed text-faint";

const navItemClass = (selected: boolean) =>
  `block whitespace-nowrap rounded-r-md border-l-2 px-3 py-1.5 text-left text-[13px] transition-colors ${
    selected
      ? "border-accent bg-panel font-medium text-ink"
      : "border-transparent text-dim hover:bg-panel-2 hover:text-ink"
  }`;

const StatChip = ({
  value,
  label,
  live,
}: {
  value: string;
  label: string;
  live?: boolean;
}) => (
  <div className="min-w-[88px] rounded-lg border border-edge bg-panel-2 px-3 py-2">
    <div
      className={`font-mono text-base font-semibold ${live ? "text-live" : "text-ink"}`}
    >
      {value}
    </div>
    <div className="mt-0.5 font-mono text-[10px] uppercase tracking-[0.08em] text-dim">
      {label}
    </div>
  </div>
);

// Sidebar-nav settings: one section visible at a time. Everything is
// already fetched by the server page; switching panes is pure client state
// (hidden, not unmounted, so form input and loaded ledger pages survive a
// switch). Only "load more" talks to the API.
const SettingsPanes = ({
  account,
  siteUrl,
  balance,
  initialLedger,
  ledgerTotal,
  referralUrl,
  stats,
}: {
  account: { username: string | null; email: string; createdAt: string };
  siteUrl: string | null;
  balance: number;
  initialLedger: LedgerEntry[];
  ledgerTotal: number;
  // null when the account has no username — the referrals section is hidden.
  referralUrl: string | null;
  stats: { signups: number; rewarded: number; earned: number };
}) => {
  const [active, setActive] = useState<SectionKey>("account");
  const [entries, setEntries] = useState(initialLedger);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loadFailed, setLoadFailed] = useState(false);

  // The ledger is append-only, so the page-load total only ever undercounts.
  const hasMore = entries.length < ledgerTotal;

  const sections: SectionKey[] = referralUrl
    ? ["account", "credits", "referrals", "security"]
    : ["account", "credits", "security"];

  const loadMore = async () => {
    setLoadingMore(true);
    setLoadFailed(false);
    try {
      const more = await api<LedgerEntry[]>(
        `/api/credits/ledger?offset=${entries.length}&limit=${LEDGER_PAGE_SIZE}`,
      );
      // Entries written since page load shift offsets; drop already-shown ids.
      setEntries((prev) => {
        const seen = new Set(prev.map((entry) => entry.id));
        return [...prev, ...more.filter((entry) => !seen.has(entry.id))];
      });
    } catch {
      setLoadFailed(true);
    } finally {
      setLoadingMore(false);
    }
  };

  const siteHost = siteUrl ? new URL(siteUrl).host : null;

  return (
    <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:gap-8">
      <nav className="sm:sticky sm:top-8 sm:w-[10.5rem] sm:shrink-0">
        <div className="hidden px-3 pb-3.5 sm:block">
          <div className="truncate text-sm font-semibold text-ink">
            {account.username ?? account.email}
          </div>
          {siteHost && (
            <div className="mt-0.5 truncate font-mono text-[11px] text-dim">
              {siteHost}
            </div>
          )}
        </div>
        <div className="flex gap-1 overflow-x-auto sm:flex-col sm:gap-0.5">
          {sections.map((section) => (
            <button
              key={section}
              onClick={() => setActive(section)}
              className={navItemClass(active === section)}
            >
              {section}
            </button>
          ))}
        </div>
      </nav>

      <div className="min-w-0 flex-1">
        <section className={active === "account" ? cardClass : "hidden"}>
          <h2 className={cardLabelClass}>Account</h2>
          <dl className="mt-2">
            <div className="flex items-baseline justify-between gap-3 py-1.5 text-sm">
              <dt className="text-dim">username</dt>
              <dd className="font-mono text-xs text-ink">
                {account.username ?? "—"}
              </dd>
            </div>
            <div className="flex items-baseline justify-between gap-3 py-1.5 text-sm">
              <dt className="text-dim">site</dt>
              <dd className="min-w-0 truncate font-mono text-xs text-ink">
                {siteUrl && siteHost ? (
                  <a
                    href={siteUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="hover:underline"
                  >
                    {siteHost} ↗
                  </a>
                ) : (
                  "—"
                )}
              </dd>
            </div>
            <div className="flex items-baseline justify-between gap-3 py-1.5 text-sm">
              <dt className="text-dim">email</dt>
              <dd className="min-w-0 truncate font-mono text-xs text-ink">
                {account.email}
              </dd>
            </div>
            <div className="flex items-baseline justify-between gap-3 py-1.5 text-sm">
              <dt className="text-dim">member since</dt>
              <dd className="font-mono text-xs text-ink">
                {account.createdAt.slice(0, 10)}
              </dd>
            </div>
          </dl>
        </section>

        <section className={active === "credits" ? cardClass : "hidden"}>
          <h2 className={cardLabelClass}>Credits</h2>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="font-mono text-2xl font-semibold text-ink">
              {formatCredits(balance)}
            </span>
            <span className="font-mono text-[11px] text-dim">credits</span>
          </div>
          {entries.length > 0 && (
            <ul className="mt-3 divide-y divide-panel-2">
              {entries.map((entry) => (
                <li
                  key={entry.id}
                  className="flex items-baseline justify-between gap-3 py-1.5 text-sm"
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
                      className={`min-w-[42px] text-right font-mono text-xs ${
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
          {hasMore && (
            <button
              onClick={() => void loadMore()}
              disabled={loadingMore}
              className="mt-2.5 font-mono text-[11px] text-dim transition-colors hover:text-ink disabled:opacity-50"
            >
              {loadingMore
                ? "loading…"
                : loadFailed
                  ? "failed — retry"
                  : "load more"}
            </button>
          )}
          <p className={hintClass}>
            first publish of a page costs {formatCreditAmount(credits.publishCost)} ·
            republishing and rollbacks are free
          </p>
        </section>

        {referralUrl && (
          <section className={active === "referrals" ? cardClass : "hidden"}>
            <h2 className={cardLabelClass}>Referrals</h2>
            <div className="mt-3">
              <ReferralLink url={referralUrl} />
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <StatChip value={String(stats.signups)} label="signed up" />
              <StatChip value={String(stats.rewarded)} label="published" />
              <StatChip
                value={
                  stats.earned > 0
                    ? `+${formatCredits(stats.earned)}`
                    : formatCredits(stats.earned)
                }
                label="earned"
                live={stats.earned > 0}
              />
            </div>
            <p className={hintClass}>
              they get +{formatCredits(referrals.refereeBonus)} at signup · you earn
              +{formatCredits(referrals.referrerBonus)} when they publish their first
              page
            </p>
          </section>
        )}

        <section className={active === "security" ? cardClass : "hidden"}>
          <h2 className={cardLabelClass}>Security</h2>
          <div className="mt-4">
            <ChangePasswordForm />
          </div>
          <p className={hintClass}>
            changing your password signs you out everywhere except this browser ·{" "}
            <Link
              href="/forgot-password"
              className="text-dim underline underline-offset-2 transition-colors hover:text-ink"
            >
              forgot it? reset by email
            </Link>
          </p>
        </section>
      </div>
    </div>
  );
};

export { SettingsPanes };
