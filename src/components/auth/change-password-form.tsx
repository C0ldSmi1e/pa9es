"use client";

import { useState } from "react";
import { authClient } from "@/src/lib/auth-client";

const inputClass =
  "w-full rounded-md border border-zinc-300 px-3 py-2 text-sm outline-none " +
  "focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-900 dark:focus:border-zinc-400";

const ChangePasswordForm = () => {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const mismatch = confirmPassword !== "" && newPassword !== confirmPassword;

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (mismatch) return;
    setError(null);
    setSuccess(false);
    setSubmitting(true);
    const { error: changeError } = await authClient.changePassword({
      currentPassword,
      newPassword,
      // Revokes every other session; this browser gets a fresh session
      // cookie from the same response, so the user stays signed in here.
      revokeOtherSessions: true,
    });
    setSubmitting(false);
    if (changeError) {
      setError(
        changeError.code === "INVALID_PASSWORD"
          ? "Current password is incorrect"
          : (changeError.message ?? "Failed to change password"),
      );
      return;
    }
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setSuccess(true);
  };

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <label className="block space-y-1">
        <span className="text-sm text-zinc-700 dark:text-zinc-300">
          Current password
        </span>
        <input
          className={inputClass}
          type="password"
          autoComplete="current-password"
          value={currentPassword}
          onChange={(e) => setCurrentPassword(e.target.value)}
          required
        />
      </label>

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

      {error && (
        <p className="text-sm text-red-600 dark:text-red-400" role="alert">
          {error}
        </p>
      )}
      {success && (
        <p className="text-sm text-emerald-600 dark:text-emerald-400">
          Password updated.
        </p>
      )}

      <button
        type="submit"
        disabled={submitting || mismatch}
        className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-50 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-300"
      >
        {submitting ? "Updating…" : "Update password"}
      </button>
    </form>
  );
};

export { ChangePasswordForm };
