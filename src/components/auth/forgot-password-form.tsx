"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { authClient } from "@/src/lib/auth-client";

const RESEND_COOLDOWN_SECONDS = 30;

const inputClass =
  "w-full rounded-lg border border-edge bg-panel-2 px-3 py-2 text-sm text-ink outline-none " +
  "transition-colors placeholder:text-faint focus:border-accent";
const labelClass = "font-mono text-[11px] uppercase tracking-[0.1em] text-dim";
const quietBtn =
  "w-full rounded-lg border border-edge px-3 py-2 text-sm font-medium text-ink " +
  "transition-colors hover:border-faint disabled:opacity-50";

const Brand = () => (
  <Link href="/" className="mb-6 font-mono text-base text-ink">
    pa<b className="font-semibold text-accent">9</b>es
  </Link>
);

const ForgotPasswordForm = () => {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  // The sent state renders the same whether or not the account exists — the
  // server responds identically either way (anti-enumeration).
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown((value) => value - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  const request = async (target: string) => {
    setError(null);
    const { error: requestError } = await authClient.requestPasswordReset({
      email: target,
      redirectTo: "/reset-password",
    });
    if (requestError) {
      setError(requestError.message ?? "Something went wrong — try again");
      return false;
    }
    setCooldown(RESEND_COOLDOWN_SECONDS);
    return true;
  };

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    const ok = await request(email);
    setSubmitting(false);
    if (ok) setSentTo(email);
  };

  if (sentTo) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center bg-ground p-6 font-sans">
        <Brand />
        <div className="w-full max-w-sm space-y-5 rounded-xl border border-edge bg-panel p-6">
          <div>
            <h1 className="text-xl font-semibold tracking-tight text-ink">
              Check your inbox
            </h1>
            <p className="mt-1 text-sm text-dim">
              If an account exists for{" "}
              <span className="font-medium text-ink">{sentTo}</span>, we sent a
              password reset link. It expires in one hour.
            </p>
          </div>

          {error && (
            <p className="text-sm text-danger" role="alert">
              {error}
            </p>
          )}

          <button
            onClick={() => void request(sentTo)}
            disabled={cooldown > 0}
            className={quietBtn}
          >
            {cooldown > 0 ? `Resend in ${cooldown}s` : "Resend email"}
          </button>

          <p className="text-center text-sm text-dim">
            <Link
              href="/login"
              className="text-ink underline decoration-faint underline-offset-2 hover:decoration-ink"
            >
              Back to login
            </Link>
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-ground p-6 font-sans">
      <Brand />
      <form
        onSubmit={onSubmit}
        className="w-full max-w-sm space-y-5 rounded-xl border border-edge bg-panel p-6"
      >
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-ink">
            Reset your password
          </h1>
          <p className="mt-1 text-sm text-dim">
            Enter your account email and we&#39;ll send you a reset link.
          </p>
        </div>

        <label className="block space-y-1.5">
          <span className={labelClass}>email</span>
          <input
            className={inputClass}
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
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
          {submitting ? "Sending…" : "Send reset link"}
        </button>

        <p className="text-center text-sm text-dim">
          Remembered it?{" "}
          <Link
            href="/login"
            className="text-ink underline decoration-faint underline-offset-2 hover:decoration-ink"
          >
            Log in
          </Link>
        </p>
      </form>
    </main>
  );
};

export { ForgotPasswordForm };
