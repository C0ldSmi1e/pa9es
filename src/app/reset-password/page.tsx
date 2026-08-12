import Link from "next/link";
import { ResetPasswordForm } from "@/src/components/auth/reset-password-form";

type PageProps = { searchParams: Promise<{ token?: string; error?: string }> };

const ResetPasswordPage = async ({ searchParams }: PageProps) => {
  const { token, error } = await searchParams;

  if (!token || error) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center bg-ground p-6 font-sans">
        <Link href="/" className="mb-6 font-mono text-base text-ink">
          pa<b className="font-semibold text-accent">9</b>es
        </Link>
        <div className="w-full max-w-sm space-y-5 rounded-xl border border-edge bg-panel p-6">
          <div>
            <h1 className="text-xl font-semibold tracking-tight text-ink">
              Link invalid or expired
            </h1>
            <p className="mt-1 text-sm text-dim">
              Reset links can only be used once and expire after one hour.
            </p>
          </div>
          <Link
            href="/forgot-password"
            className="block w-full rounded-lg bg-ink px-3 py-2 text-center text-sm font-medium text-panel transition hover:opacity-85"
          >
            Request a new link
          </Link>
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

  return <ResetPasswordForm token={token} />;
};

export default ResetPasswordPage;
