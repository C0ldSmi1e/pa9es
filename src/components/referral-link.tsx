"use client";

import { useRef, useState } from "react";

const ReferralLink = ({ url }: { url: string }) => {
  const [copied, setCopied] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => setCopied(false), 1500);
    } catch {
      // clipboard unavailable (permissions/http) — the link is selectable
    }
  };

  return (
    <div className="flex items-center gap-2">
      <code className="min-w-0 flex-1 truncate rounded-md border border-edge bg-panel-2 px-2 py-1.5 font-mono text-xs text-ink">
        {url}
      </code>
      <button
        onClick={() => void copy()}
        className="shrink-0 rounded-md border border-edge px-3 py-1.5 text-xs font-medium text-dim transition-colors hover:text-ink"
      >
        {copied ? "copied" : "copy"}
      </button>
    </div>
  );
};

export { ReferralLink };
