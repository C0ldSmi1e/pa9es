"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { authClient } from "@/src/lib/auth-client";

const inputClass =
  "w-full rounded-lg border border-edge bg-panel-2 px-3 py-2 text-sm text-ink outline-none " +
  "transition-colors placeholder:text-faint focus:border-accent";
const labelClass = "font-mono text-[11px] uppercase tracking-[0.1em] text-dim";

// notice: informational banner from the server (e.g. an expired verification
// link redirected here), as opposed to `error`, which reports a failed submit.
const LoginForm = ({ notice = null }: { notice?: string | null }) => {
  const router = useRouter();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    // One field for either credential: emails contain "@", usernames can't.
    const trimmed = identifier.trim();
    const { error: signInError } = trimmed.includes("@")
      ? await authClient.signIn.email({ email: trimmed, password })
      : await authClient.signIn.username({
          username: trimmed.toLowerCase(),
          password,
        });
    if (signInError) {
      // The server re-sends the verification email on this failure
      // (sendOnSignIn), so the copy can promise a fresh link.
      setError(
        signInError.code === "EMAIL_NOT_VERIFIED"
          ? "Your email isn't verified yet — we just sent you a new verification link."
          : (signInError.message ?? "Sign in failed"),
      );
      setSubmitting(false);
      return;
    }
    router.push("/app");
    router.refresh();
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-ground p-6 font-sans">
      <Link href="/" className="mb-6 font-mono text-base text-ink">
        pa<b className="font-semibold text-accent">9</b>es
      </Link>
      <form
        onSubmit={onSubmit}
        className="w-full max-w-sm space-y-5 rounded-xl border border-edge bg-panel p-6"
      >
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-ink">
            Welcome back
          </h1>
          <p className="mt-1 text-sm text-dim">
            Your pages are where you left them.
          </p>
        </div>

        {notice && (
          <p className="rounded-lg border border-accent/25 bg-accent/10 px-3 py-2 text-sm text-ink">
            {notice}
          </p>
        )}

        <label className="block space-y-1.5">
          <span className={labelClass}>email or username</span>
          <input
            className={inputClass}
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            required
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
          />
        </label>

        <label className="block space-y-1.5">
          <span className="flex items-baseline justify-between">
            <span className={labelClass}>password</span>
            <Link
              href="/forgot-password"
              className="text-xs text-dim transition-colors hover:text-ink"
            >
              Forgot password?
            </Link>
          </span>
          <input
            className={inputClass}
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </label>

        {error && (
          <p className="text-sm text-danger" role="alert">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-lg bg-ink px-3 py-2 text-sm font-medium text-panel transition hover:opacity-85 active:translate-y-px disabled:opacity-50"
        >
          {submitting ? "Signing in…" : "Log in"}
        </button>

        <p className="text-center text-sm text-dim">
          New here?{" "}
          <Link
            href="/signup"
            className="text-ink underline decoration-faint underline-offset-2 hover:decoration-ink"
          >
            Create an account
          </Link>
        </p>
      </form>
    </main>
  );
};

export { LoginForm };
