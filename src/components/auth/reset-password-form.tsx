"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { authClient } from "@/src/lib/auth-client";

const inputClass =
  "w-full rounded-lg border border-edge bg-panel-2 px-3 py-2 text-sm text-ink outline-none " +
  "transition-colors placeholder:text-faint focus:border-accent";
const labelClass = "font-mono text-[11px] uppercase tracking-[0.1em] text-dim";

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
            Choose a new password
          </h1>
          <p className="mt-1 text-sm text-dim">
            You&#39;ll be signed out everywhere and can log in with the new password.
          </p>
        </div>

        <label className="block space-y-1.5">
          <span className={labelClass}>new password</span>
          <input
            className={inputClass}
            type="password"
            autoComplete="new-password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            required
            minLength={8}
          />
          <span className="block text-xs text-faint">At least 8 characters</span>
        </label>

        <label className="block space-y-1.5">
          <span className={labelClass}>confirm new password</span>
          <input
            className={inputClass}
            type="password"
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
          />
          {mismatch && (
            <span className="block text-xs text-danger">
              Passwords don&#39;t match
            </span>
          )}
        </label>

        {tokenDead ? (
          <p className="text-sm text-danger" role="alert">
            This reset link is invalid or has expired.{" "}
            <Link href="/forgot-password" className="underline">
              Request a new one
            </Link>
          </p>
        ) : (
          error && (
            <p className="text-sm text-danger" role="alert">
              {error}
            </p>
          )
        )}

        <button
          type="submit"
          disabled={submitting || mismatch || tokenDead}
          className="w-full rounded-lg bg-ink px-3 py-2 text-sm font-medium text-panel transition hover:opacity-85 active:translate-y-px disabled:opacity-50"
        >
          {submitting ? "Updating…" : "Update password"}
        </button>
      </form>
    </main>
  );
};

export { ResetPasswordForm };
