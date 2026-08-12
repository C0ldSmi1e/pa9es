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
    <main className="min-h-screen bg-zinc-50 font-sans dark:bg-black">
      <div className="mx-auto max-w-2xl space-y-6 p-6">
        <header className="flex items-center justify-between">
          <div className="flex items-baseline gap-3">
            <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
              Settings
            </h1>
            <span className="text-sm text-zinc-500">
              {session.user.username ?? session.user.email}
            </span>
          </div>
          <Link
            href="/app"
            className="text-sm text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
          >
            ← Dashboard
          </Link>
        </header>

        <section className="space-y-4 rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
          <div>
            <h2 className="text-sm font-medium text-zinc-900 dark:text-zinc-50">
              Change password
            </h2>
            <p className="mt-0.5 text-xs text-zinc-500">
              Changing your password signs you out everywhere except this browser.
            </p>
          </div>
          <ChangePasswordForm />
        </section>
      </div>
    </main>
  );
};

export default SettingsPage;
