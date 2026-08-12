import Link from "next/link";
import { ResetPasswordForm } from "@/src/components/auth/reset-password-form";

type PageProps = { searchParams: Promise<{ token?: string; error?: string }> };

const ResetPasswordPage = async ({ searchParams }: PageProps) => {
  const { token, error } = await searchParams;

  if (!token || error) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-zinc-50 p-6 font-sans dark:bg-black">
        <div className="w-full max-w-sm space-y-4 rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950">
          <div>
            <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
              Link invalid or expired
            </h1>
            <p className="mt-1 text-sm text-zinc-500">
              Reset links can only be used once and expire after one hour.
            </p>
          </div>
          <Link
            href="/forgot-password"
            className="block w-full rounded-md bg-zinc-900 px-3 py-2 text-center text-sm font-medium text-white hover:bg-zinc-700 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-300"
          >
            Request a new link
          </Link>
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

  return <ResetPasswordForm token={token} />;
};

export default ResetPasswordPage;
