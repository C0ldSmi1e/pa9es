"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { authClient } from "@/src/lib/auth-client";
import { usernameSchema } from "@/src/schemas/user";

const RESEND_COOLDOWN_SECONDS = 30;

const inputClass =
  "w-full rounded-lg border border-edge bg-panel-2 px-3 py-2 text-sm text-ink outline-none " +
  "transition-colors placeholder:text-faint focus:border-accent";
const labelClass = "font-mono text-[11px] uppercase tracking-[0.1em] text-dim";
const primaryBtn =
  "w-full rounded-lg bg-ink px-3 py-2 text-sm font-medium text-panel transition " +
  "hover:opacity-85 active:translate-y-px disabled:opacity-50";
const quietBtn =
  "w-full rounded-lg border border-edge px-3 py-2 text-sm font-medium text-ink " +
  "transition-colors hover:border-faint disabled:opacity-50";

const Brand = () => (
  <Link href="/" className="mb-6 font-mono text-base text-ink">
    pa<b className="font-semibold text-accent">9</b>es
  </Link>
);

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
      <main className="flex min-h-screen flex-col items-center justify-center bg-ground p-6 font-sans">
        <Brand />
        <div className="w-full max-w-sm space-y-5 rounded-xl border border-edge bg-panel p-6">
          <div>
            <h1 className="text-xl font-semibold tracking-tight text-ink">
              Check your inbox
            </h1>
            <p className="mt-1 text-sm text-dim">
              We sent a verification link to{" "}
              <span className="font-medium text-ink">{sentTo}</span>. Click it to
              activate your account — the link expires in one hour.
            </p>
          </div>

          {error && (
            <p className="text-sm text-danger" role="alert">
              {error}
            </p>
          )}

          <button onClick={resend} disabled={cooldown > 0} className={quietBtn}>
            {cooldown > 0 ? `Resend in ${cooldown}s` : "Resend email"}
          </button>

          <p className="text-center text-sm text-dim">
            Wrong address?{" "}
            <button
              onClick={() => {
                setSentTo(null);
                setError(null);
              }}
              className="text-ink underline decoration-faint underline-offset-2 hover:decoration-ink"
            >
              Start over
            </button>
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
            Create your account
          </h1>
          <p className="mt-1 text-sm text-dim">
            Your pages will live at{" "}
            <span className="font-mono text-[0.95em] text-ink">
              {normalizedUsername || "you"}.{rootDomain}
            </span>
          </p>
        </div>

        <label className="block space-y-1.5">
          <span className={labelClass}>name</span>
          <input
            className={inputClass}
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            maxLength={100}
          />
        </label>

        <label className="block space-y-1.5">
          <span className={labelClass}>username</span>
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
            <span className="block text-xs text-danger">{usernameIssue}</span>
          ) : normalizedUsername !== "" ? (
            <span className="block text-xs text-live">Looks good</span>
          ) : null}
        </label>

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

        <label className="block space-y-1.5">
          <span className={labelClass}>password</span>
          <input
            className={inputClass}
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={8}
          />
          <span className="block text-xs text-faint">At least 8 characters</span>
        </label>

        {error && (
          <p className="text-sm text-danger" role="alert">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={submitting || usernameIssue !== null}
          className={primaryBtn}
        >
          {submitting ? "Creating account…" : "Sign up"}
        </button>

        <p className="text-center text-sm text-dim">
          Already have an account?{" "}
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

export { SignupForm };
