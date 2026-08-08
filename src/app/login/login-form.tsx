"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { authClient } from "@/src/clients/auth";

const inputClass =
  "w-full rounded-md border border-zinc-300 px-3 py-2 text-sm outline-none " +
  "focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-900 dark:focus:border-zinc-400";

const LoginForm = () => {
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
      setError(signInError.message ?? "Sign in failed");
      setSubmitting(false);
      return;
    }
    router.push("/app");
    router.refresh();
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-zinc-50 p-6 font-sans dark:bg-black">
      <form
        onSubmit={onSubmit}
        className="w-full max-w-sm space-y-4 rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950"
      >
        <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
          Welcome back
        </h1>

        <label className="block space-y-1">
          <span className="text-sm text-zinc-700 dark:text-zinc-300">
            Email or username
          </span>
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

        <label className="block space-y-1">
          <span className="text-sm text-zinc-700 dark:text-zinc-300">Password</span>
          <input
            className={inputClass}
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
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
          {submitting ? "Signing in…" : "Log in"}
        </button>

        <p className="text-center text-sm text-zinc-500">
          New here?{" "}
          <Link href="/signup" className="text-zinc-900 underline dark:text-zinc-50">
            Create an account
          </Link>
        </p>
      </form>
    </main>
  );
};

export { LoginForm };
