"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { authClient } from "@/src/lib/auth-client";

const RESEND_COOLDOWN_SECONDS = 30;

const inputClass =
  "w-full rounded-md border border-zinc-300 px-3 py-2 text-sm outline-none " +
  "focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-900 dark:focus:border-zinc-400";

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
      <main className="flex min-h-screen items-center justify-center bg-zinc-50 p-6 font-sans dark:bg-black">
        <div className="w-full max-w-sm space-y-4 rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950">
          <div>
            <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
              Check your inbox
            </h1>
            <p className="mt-1 text-sm text-zinc-500">
              If an account exists for{" "}
              <span className="font-medium text-zinc-700 dark:text-zinc-300">
                {sentTo}
              </span>
              , we sent a password reset link. It expires in one hour.
            </p>
          </div>

          {error && (
            <p className="text-sm text-red-600 dark:text-red-400" role="alert">
              {error}
            </p>
          )}

          <button
            onClick={() => void request(sentTo)}
            disabled={cooldown > 0}
            className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-100 disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-900"
          >
            {cooldown > 0 ? `Resend in ${cooldown}s` : "Resend email"}
          </button>

          <p className="text-center text-sm text-zinc-500">
            <Link
              href="/login"
              className="text-zinc-900 underline dark:text-zinc-50"
            >
              Back to login
            </Link>
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-zinc-50 p-6 font-sans dark:bg-black">
      <form
        onSubmit={onSubmit}
        className="w-full max-w-sm space-y-4 rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950"
      >
        <div>
          <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
            Reset your password
          </h1>
          <p className="mt-1 text-sm text-zinc-500">
            Enter your account email and we&#39;ll send you a reset link.
          </p>
        </div>

        <label className="block space-y-1">
          <span className="text-sm text-zinc-700 dark:text-zinc-300">Email</span>
          <input
            className={inputClass}
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </label>

        {error && (
          <p className="text-sm text-red-600 dark:text-red-400" role="alert">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-md bg-zinc-900 px-3 py-2 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-50 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-300"
        >
          {submitting ? "Sending…" : "Send reset link"}
        </button>

        <p className="text-center text-sm text-zinc-500">
          Remembered it?{" "}
          <Link href="/login" className="text-zinc-900 underline dark:text-zinc-50">
            Log in
          </Link>
        </p>
      </form>
    </main>
  );
};

export { ForgotPasswordForm };
