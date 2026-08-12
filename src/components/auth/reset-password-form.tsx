"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { authClient } from "@/src/lib/auth-client";

const inputClass =
  "w-full rounded-md border border-zinc-300 px-3 py-2 text-sm outline-none " +
  "focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-900 dark:focus:border-zinc-400";

const ResetPasswordForm = ({ token }: { token: string }) => {
  const router = useRouter();
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  // Tokens are single-use and expire; if this one dies between page load and
  // submit, offer the way back to a fresh link.
  const [tokenDead, setTokenDead] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const mismatch = confirmPassword !== "" && newPassword !== confirmPassword;

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (mismatch) return;
    setError(null);
    setSubmitting(true);
    const { error: resetError } = await authClient.resetPassword({
      newPassword,
      token,
    });
    if (resetError) {
      setSubmitting(false);
      if (resetError.code === "INVALID_TOKEN") {
        setTokenDead(true);
      } else {
        setError(resetError.message ?? "Failed to reset password");
      }
      return;
    }
    router.push("/login?reset=success");
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-zinc-50 p-6 font-sans dark:bg-black">
      <form
        onSubmit={onSubmit}
        className="w-full max-w-sm space-y-4 rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950"
      >
        <div>
          <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
            Choose a new password
          </h1>
          <p className="mt-1 text-sm text-zinc-500">
            You&#39;ll be signed out everywhere and can log in with the new password.
          </p>
        </div>

        <label className="block space-y-1">
          <span className="text-sm text-zinc-700 dark:text-zinc-300">
            New password
          </span>
          <input
            className={inputClass}
            type="password"
            autoComplete="new-password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            required
            minLength={8}
          />
          <span className="block text-xs text-zinc-500">At least 8 characters</span>
        </label>

        <label className="block space-y-1">
          <span className="text-sm text-zinc-700 dark:text-zinc-300">
            Confirm new password
          </span>
          <input
            className={inputClass}
            type="password"
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
          />
          {mismatch && (
            <span className="block text-xs text-red-600 dark:text-red-400">
              Passwords don&#39;t match
            </span>
          )}
        </label>

        {tokenDead ? (
          <p className="text-sm text-red-600 dark:text-red-400" role="alert">
            This reset link is invalid or has expired.{" "}
            <Link href="/forgot-password" className="underline">
              Request a new one
            </Link>
          </p>
        ) : (
          error && (
            <p className="text-sm text-red-600 dark:text-red-400" role="alert">
              {error}
            </p>
          )
        )}

        <button
          type="submit"
          disabled={submitting || mismatch || tokenDead}
          className="w-full rounded-md bg-zinc-900 px-3 py-2 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-50 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-300"
        >
          {submitting ? "Updating…" : "Update password"}
        </button>
      </form>
    </main>
  );
};

export { ResetPasswordForm };
