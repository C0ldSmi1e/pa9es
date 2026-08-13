import Link from "next/link";
import { redirect } from "next/navigation";
import { SettingsPanes } from "@/src/components/settings/settings-panes";
import { getBalance, listLedger } from "@/src/server/actions/credits";
import { referralStats } from "@/src/server/actions/referrals";
import { app, authConfig } from "@/src/server/env";
import { getSession } from "@/src/server/session";

// Account settings: sidebar nav (account / credits / referrals / security),
// one section visible at a time. All data is fetched here once; the client
// component only switches panes and pages the ledger through the API.
const SettingsPage = async () => {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }

  const { user } = session;
  const { balance } = await getBalance({ userId: user.id });
  const ledger = await listLedger({ userId: user.id, offset: 0, limit: 10 });
  const stats = await referralStats({ userId: user.id });

  // Live-site link uses the canonical protocol, same as the dashboard rows.
  const protocol = new URL(authConfig.url).protocol;
  const siteUrl = user.username
    ? `${protocol}//${user.username}.${app.rootDomain}`
    : null;

  // ?ref= on the canonical origin; ReferralCapture picks it up on landing.
  let referralUrl: string | null = null;
  if (user.username) {
    const url = new URL(authConfig.url);
    url.searchParams.set("ref", user.username);
    referralUrl = url.toString();
  }

  return (
    <main className="min-h-screen bg-ground font-sans">
      <div className="mx-auto max-w-4xl px-6 py-8">
        <header className="flex items-baseline justify-between border-b border-edge pb-4">
          <h1 className="text-lg font-semibold tracking-tight text-ink">Settings</h1>
          <Link
            href="/app"
            className="text-sm text-dim transition-colors hover:text-ink"
          >
            ← Pages
          </Link>
        </header>
        <div className="mt-6">
          <SettingsPanes
            account={{
              username: user.username ?? null,
              email: user.email,
              createdAt: user.createdAt.toISOString(),
            }}
            siteUrl={siteUrl}
            balance={balance}
            initialLedger={ledger.data}
            ledgerTotal={ledger.pagination?.total ?? ledger.data.length}
            referralUrl={referralUrl}
            stats={stats}
          />
        </div>
      </div>
    </main>
  );
};

export default SettingsPage;
