import Link from "next/link";
import { app } from "@/src/server/env";
import { getSession } from "@/src/server/session";

const Home = async () => {
  const session = await getSession();

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-8 bg-zinc-50 p-6 font-sans dark:bg-black">
      <div className="max-w-md space-y-4 text-center">
        <h1 className="text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          pa9es
        </h1>
        <p className="text-lg text-zinc-700 dark:text-zinc-300">
          One HTML file, live in thirty seconds.
        </p>
        <p className="text-sm text-zinc-500">
          Write or paste your HTML, name it, publish. No build step, no repo, no
          subscription.
        </p>
        <p className="rounded-lg bg-zinc-100 px-4 py-2 font-mono text-sm text-zinc-700 dark:bg-zinc-900 dark:text-zinc-300">
          you.{app.rootDomain}/your-page
        </p>
      </div>

      <div className="flex items-center gap-3">
        {session ? (
          <Link
            href="/app"
            className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-300"
          >
            Open dashboard
          </Link>
        ) : (
          <>
            <Link
              href="/signup"
              className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-300"
            >
              Get started
            </Link>
            <Link
              href="/login"
              className="rounded-md border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-900"
            >
              Log in
            </Link>
          </>
        )}
      </div>
    </main>
  );
};

export default Home;
