import Link from "next/link";
import { redirect } from "next/navigation";
import { ChangePasswordForm } from "@/src/components/auth/change-password-form";
import { getSession } from "@/src/server/session";

// Account settings. Password only for now; profile/email updates land here
// later (see docs/system-overview.md future list).
const SettingsPage = async () => {
  const session = await getSession();
  if (!session) {
    redirect("/login");
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
