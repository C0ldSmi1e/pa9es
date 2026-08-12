"use client";

import { useState } from "react";
import { authClient } from "@/src/lib/auth-client";

const inputClass =
  "w-full rounded-lg border border-edge bg-panel-2 px-3 py-2 text-sm text-ink outline-none " +
  "transition-colors placeholder:text-faint focus:border-accent";
const labelClass = "font-mono text-[11px] uppercase tracking-[0.1em] text-dim";

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
      <label className="block space-y-1.5">
        <span className={labelClass}>current password</span>
        <input
          className={inputClass}
          type="password"
          autoComplete="current-password"
          value={currentPassword}
          onChange={(e) => setCurrentPassword(e.target.value)}
          required
        />
      </label>

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

      {error && (
        <p className="text-sm text-danger" role="alert">
          {error}
        </p>
      )}
      {success && <p className="text-sm text-live">Password updated.</p>}

      <button
        type="submit"
        disabled={submitting || mismatch}
        className="rounded-lg border border-edge px-4 py-2 text-sm font-medium text-ink transition-colors hover:border-faint disabled:opacity-50"
      >
        {submitting ? "Updating…" : "Update password"}
      </button>
    </form>
  );
};

export { ChangePasswordForm };
