"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { authClient } from "@/src/lib/auth-client";
import { usernameSchema } from "@/src/schemas/user";

const RESEND_COOLDOWN_SECONDS = 30;

const inputClass =
  "w-full rounded-md border border-zinc-300 px-3 py-2 text-sm outline-none " +
  "focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-900 dark:focus:border-zinc-400";

const SignupForm = ({ rootDomain }: { rootDomain: string }) => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown((value) => value - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  const usernameIssue = useMemo(() => {
    if (username === "") {
      return null;
    }
    const result = usernameSchema.safeParse(username);
    return result.success ? null : result.error.issues[0].message;
  }, [username]);

  const normalizedUsername = username.trim().toLowerCase();

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    const { error: signUpError } = await authClient.signUp.email({
      name,
      email,
      password,
      username: normalizedUsername,
      callbackURL: "/app",
    });
    setSubmitting(false);
    if (signUpError) {
      setError(signUpError.message ?? "Sign up failed");
      return;
    }
    setSentTo(email);
    setCooldown(RESEND_COOLDOWN_SECONDS);
  };

  const resend = async () => {
    if (!sentTo) return;
    setError(null);
    const { error: resendError } = await authClient.sendVerificationEmail({
      email: sentTo,
      callbackURL: "/app",
    });
    if (resendError) {
      setError(resendError.message ?? "Failed to resend the email");
      return;
    }
    setCooldown(RESEND_COOLDOWN_SECONDS);
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
              We sent a verification link to{" "}
              <span className="font-medium text-zinc-700 dark:text-zinc-300">
                {sentTo}
              </span>
              . Click it to activate your account — the link expires in one hour.
            </p>
          </div>

          {error && (
            <p className="text-sm text-red-600 dark:text-red-400" role="alert">
              {error}
            </p>
          )}

          <button
            onClick={resend}
            disabled={cooldown > 0}
            className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-100 disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-900"
          >
            {cooldown > 0 ? `Resend in ${cooldown}s` : "Resend email"}
          </button>

          <p className="text-center text-sm text-zinc-500">
            Wrong address?{" "}
            <button
              onClick={() => {
                setSentTo(null);
                setError(null);
              }}
              className="text-zinc-900 underline dark:text-zinc-50"
            >
              Start over
            </button>
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
            Create your account
          </h1>
          <p className="mt-1 text-sm text-zinc-500">
            Your pages will live at{" "}
            <span className="font-mono text-zinc-700 dark:text-zinc-300">
              {normalizedUsername || "you"}.{rootDomain}
            </span>
          </p>
        </div>

        <label className="block space-y-1">
          <span className="text-sm text-zinc-700 dark:text-zinc-300">Name</span>
          <input
            className={inputClass}
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            maxLength={100}
          />
        </label>

        <label className="block space-y-1">
          <span className="text-sm text-zinc-700 dark:text-zinc-300">Username</span>
          <input
            className={inputClass}
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
          />
          {usernameIssue ? (
            <span className="block text-xs text-red-600 dark:text-red-400">
              {usernameIssue}
            </span>
          ) : normalizedUsername !== "" ? (
            <span className="block text-xs text-emerald-600 dark:text-emerald-400">
              Looks good
            </span>
          ) : null}
        </label>

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

        <label className="block space-y-1">
          <span className="text-sm text-zinc-700 dark:text-zinc-300">Password</span>
          <input
            className={inputClass}
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={8}
          />
          <span className="block text-xs text-zinc-500">At least 8 characters</span>
        </label>

        {error && (
          <p className="text-sm text-red-600 dark:text-red-400" role="alert">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={submitting || usernameIssue !== null}
          className="w-full rounded-md bg-zinc-900 px-3 py-2 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-50 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-300"
        >
          {submitting ? "Creating account…" : "Sign up"}
        </button>

        <p className="text-center text-sm text-zinc-500">
          Already have an account?{" "}
          <Link href="/login" className="text-zinc-900 underline dark:text-zinc-50">
            Log in
          </Link>
        </p>
      </form>
    </main>
  );
};

export { SignupForm };
