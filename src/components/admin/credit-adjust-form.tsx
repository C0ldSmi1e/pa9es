"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { credits } from "@/src/config/constants";
import { api } from "@/src/lib/api";

// Admin grant/deduct. Amount is typed in display credits (signed, decimals
// ok) and converted to internal units here — the API only speaks units.
const CreditAdjustForm = ({ userId }: { userId: string }) => {
  const router = useRouter();
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const parsed = Number.parseFloat(amount);
    const units = Math.round(parsed * credits.scale);
    if (!Number.isFinite(parsed) || units === 0) {
      setError("Enter a non-zero amount");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await api("/api/admin/credits", {
        method: "POST",
        body: JSON.stringify({
          userId,
          amount: units,
          note: note.trim() || undefined,
        }),
      });
      setAmount("");
      setNote("");
      router.refresh();
    } catch (requestError) {
      setError(
        requestError instanceof Error ? requestError.message : "Request failed",
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={onSubmit} className="space-y-2">
      <div className="flex gap-2">
        <input
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="+500 or -100"
          aria-label="Credit amount"
          inputMode="decimal"
          className="w-24 rounded-md border border-edge bg-panel-2 px-2 py-1.5 font-mono text-xs text-ink outline-none transition-colors placeholder:text-faint focus:border-accent"
        />
        <input
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="note (optional)"
          aria-label="Adjustment note"
          maxLength={200}
          className="min-w-0 flex-1 rounded-md border border-edge bg-panel-2 px-2 py-1.5 text-xs text-ink outline-none transition-colors placeholder:text-faint focus:border-accent"
        />
        <button
          type="submit"
          disabled={busy || amount.trim() === ""}
          className="shrink-0 rounded-md border border-edge px-3 py-1.5 text-xs font-medium text-ink transition-colors hover:border-faint disabled:opacity-40"
        >
          {busy ? "…" : "Adjust"}
        </button>
      </div>
      {error && (
        <p className="text-xs text-danger" role="alert">
          {error}
        </p>
      )}
    </form>
  );
};

export { CreditAdjustForm };
