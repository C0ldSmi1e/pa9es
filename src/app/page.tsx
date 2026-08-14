import Link from "next/link";
import { TypewriterDemo } from "@/src/components/home/typewriter-demo";
import { app } from "@/src/server/env";
import { getSession } from "@/src/server/session";

const primaryBtn =
  "rounded-lg bg-ink px-4 py-2.5 text-sm font-medium text-panel transition hover:opacity-85 active:translate-y-px";
const ghostBtn =
  "rounded-lg border border-edge px-4 py-2.5 text-sm font-medium text-ink transition-colors hover:border-faint";

const Home = async () => {
  const session = await getSession();

  return (
    <main className="min-h-screen bg-ground font-sans">
      <div className="mx-auto max-w-5xl px-6 pb-16 pt-7">
        <nav className="mb-16 flex items-center justify-between md:mb-20">
          <span className="font-mono text-base text-ink">
            pa<b className="font-semibold text-accent">9</b>es
          </span>
          <div className="flex items-center gap-2">
            {session ? (
              <Link
                href="/app"
                className="rounded-lg bg-ink px-3.5 py-2 text-sm font-medium text-panel transition hover:opacity-85"
              >
                Open dashboard
              </Link>
            ) : (
              <>
                <Link
                  href="/login"
                  className="rounded-lg px-3.5 py-2 text-sm text-dim transition-colors hover:text-ink"
                >
                  Log in
                </Link>
                <Link
                  href="/signup"
                  className="rounded-lg bg-ink px-3.5 py-2 text-sm font-medium text-panel transition hover:opacity-85"
                >
                  Sign up
                </Link>
              </>
            )}
          </div>
        </nav>

        <header className="mb-14 text-center">
          <h1 className="mb-4 text-balance text-[clamp(2.4rem,7vw,4rem)] font-semibold leading-[1.05] tracking-[-0.03em] text-ink">
            <span className="font-mono font-medium tracking-[-0.04em] text-accent">
              <span className="font-normal text-faint">&lt;</span>html
              <span className="font-normal text-faint">&gt;</span>
            </span>{" "}
            is all you need
          </h1>
          <p className="mx-auto mb-8 max-w-xl text-lg leading-relaxed text-dim">
            One file, live at{" "}
            <span className="font-mono text-[0.95em]">
              you.{app.rootDomain}/anything
            </span>{" "}
            in thirty seconds. No build step, no repo, no subscription.
          </p>
          <div className="flex justify-center gap-3">
            {session ? (
              <Link href="/app" className={primaryBtn}>
                Open dashboard
              </Link>
            ) : (
              <>
                <Link href="/signup" className={primaryBtn}>
                  Create a page
                </Link>
                <Link href="/login" className={ghostBtn}>
                  Log in
                </Link>
              </>
            )}
          </div>
        </header>

        <TypewriterDemo />

        <footer className="mt-12 text-center text-sm text-faint">
          <p>
            Landing pages · demos · résumés · the page your{" "}
            <span className="font-medium text-dim">AI just wrote you</span> · © pa9es
          </p>
          <p className="mt-2">
            <a
              href="https://github.com/C0ldSmi1e/pa9es"
              target="_blank"
              rel="noopener noreferrer"
              className="transition-colors hover:text-ink"
            >
              github
            </a>{" "}
            · made by{" "}
            <a
              href="https://www.C0ldSmi1e.com"
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-dim transition-colors hover:text-ink"
            >
              C0ldSmi1e
            </a>
          </p>
        </footer>
      </div>
    </main>
  );
};

export default Home;
