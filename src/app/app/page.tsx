import { redirect } from "next/navigation";
import { getSession } from "@/src/utils/session";
import { SignOutButton } from "@/src/app/app/sign-out-button";

// Placeholder authed landing — the real dashboard replaces this content.
const AppPage = async () => {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-zinc-50 p-6 font-sans dark:bg-black">
      <div className="w-full max-w-sm space-y-4 rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950">
        <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
          Dashboard
        </h1>
        <p className="text-sm text-zinc-500">
          Signed in as{" "}
          <span className="font-medium text-zinc-900 dark:text-zinc-50">
            {session.user.username ?? session.user.email}
          </span>
        </p>
        <p className="text-sm text-zinc-500">Project management lands here next.</p>
        <SignOutButton />
      </div>
    </main>
  );
};

export default AppPage;
