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
      {error && <span className="text-xs text-danger">{error}</span>}
      <button
        onClick={onClick}
        disabled={busy}
        className={
          banned
            ? "rounded-md border border-edge px-3 py-1.5 text-xs font-medium text-ink transition-colors hover:border-faint disabled:opacity-50"
            : "rounded-md border border-edge px-3 py-1.5 text-xs text-dim transition-colors hover:border-danger hover:text-danger disabled:opacity-50"
        }
      >
        {busy ? "…" : banned ? "Unban" : "Ban"}
      </button>
    </span>
  );
};

export { BanButton };
