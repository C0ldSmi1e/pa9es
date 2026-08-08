"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/src/lib/auth-client";

// Banning takes the user's published pages off the air (the serving path
// filters banned owners) and blocks sign-in; unban restores both.
const BanButton = ({ userId, banned }: { userId: string; banned: boolean }) => {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onClick = async () => {
    setBusy(true);
    setError(null);
    const { error: requestError } = banned
      ? await authClient.admin.unbanUser({ userId })
      : await authClient.admin.banUser({ userId });
    if (requestError) {
      setError(requestError.message ?? "Request failed");
      setBusy(false);
      return;
    }
    router.refresh();
    setBusy(false);
  };

  return (
    <span className="flex shrink-0 items-center gap-2">
      {error && (
        <span className="text-xs text-red-600 dark:text-red-400">{error}</span>
      )}
      <button
        onClick={onClick}
        disabled={busy}
        className={
          banned
            ? "rounded-md border border-zinc-300 px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-100 disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-900"
            : "rounded-md border border-zinc-300 px-3 py-1.5 text-xs text-zinc-500 hover:border-red-400 hover:text-red-600 disabled:opacity-50 dark:border-zinc-700 dark:hover:border-red-500 dark:hover:text-red-400"
        }
      >
        {busy ? "…" : banned ? "Unban" : "Ban"}
      </button>
    </span>
  );
};

export { BanButton };
