"use client";

import { useEffect, useRef, useState } from "react";
import type { CommitSummary } from "@/src/schemas/project";

const rowClass = (selected: boolean) =>
  `cursor-pointer border-b border-zinc-200 px-3 py-2.5 dark:border-zinc-800 ${
    selected
      ? "bg-zinc-100 shadow-[inset_2px_0_0_#6366f1] dark:bg-zinc-900"
      : "hover:bg-zinc-50 dark:hover:bg-zinc-900/50"
  }`;

const tinyBtn =
  "rounded-md border border-zinc-300 px-2.5 py-1 text-xs font-medium text-zinc-700 " +
  "hover:bg-zinc-100 disabled:opacity-40 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800";
const tinyPrimary =
  "rounded-md bg-zinc-900 px-2.5 py-1 text-xs font-medium text-white hover:bg-zinc-700 " +
  "disabled:opacity-40 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-300";

const fmt = (iso: string) =>
  new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

const Timeline = ({
  commits,
  liveCommitId,
  selection,
  uncommitted,
  busy,
  pulseId,
  onSelect,
  onCommit,
  onMakeLive,
  onUnpublish,
  onRestore,
}: {
  commits: CommitSummary[];
  liveCommitId: string | null;
  selection: string;
  uncommitted: boolean;
  busy: boolean;
  pulseId: string | null;
  onSelect: (selection: string) => void;
  onCommit: (message: string) => Promise<boolean>;
  onMakeLive: (commitId: string) => void;
  onUnpublish: () => void;
  onRestore: (commit: CommitSummary) => void;
}) => {
  const [committing, setCommitting] = useState(false);
  const [message, setMessage] = useState("");
  const [messageMissing, setMessageMissing] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (committing) inputRef.current?.focus();
  }, [committing]);

  const submit = async () => {
    const trimmed = message.trim();
    if (!trimmed) {
      setMessageMissing(true);
      return;
    }
    const ok = await onCommit(trimmed);
    if (ok) {
      setCommitting(false);
      setMessage("");
      setMessageMissing(false);
    }
  };

  const latest = commits[0];

  return (
    <aside className="flex w-72 shrink-0 flex-col border-l border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
      <div className="border-b border-zinc-200 px-3 py-1 text-[11px] uppercase tracking-wider text-zinc-500 dark:border-zinc-800">
        Timeline
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto">
        {/* Draft row — the worktree */}
        <div
          className={rowClass(selection === "draft")}
          onClick={() => onSelect("draft")}
        >
          <div className="flex items-center gap-2 text-[13px] font-semibold text-zinc-900 dark:text-zinc-50">
            <span className="text-zinc-400">●</span> Draft
          </div>
          <div className="mt-0.5 text-[11px] text-zinc-500">
            {commits.length === 0
              ? "no commits yet"
              : uncommitted
                ? "uncommitted changes"
                : `same as v${latest.v}`}
          </div>
          {selection === "draft" && (
            <div className="mt-2" onClick={(e) => e.stopPropagation()}>
              {committing ? (
                <input
                  ref={inputRef}
                  value={message}
                  onChange={(e) => {
                    setMessage(e.target.value);
                    setMessageMissing(false);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") void submit();
                    if (e.key === "Escape") {
                      setCommitting(false);
                      setMessage("");
                      setMessageMissing(false);
                    }
                  }}
                  placeholder={
                    messageMissing ? "Message required" : "Commit message…"
                  }
                  className={`w-full rounded-md border px-2 py-1 text-xs outline-none dark:bg-zinc-900 ${
                    messageMissing
                      ? "border-red-500 placeholder:text-red-400"
                      : "border-indigo-500"
                  }`}
                  maxLength={200}
                />
              ) : (
                <button
                  className={tinyPrimary}
                  disabled={busy || !uncommitted}
                  onClick={() => setCommitting(true)}
                >
                  Commit
                </button>
              )}
            </div>
          )}
        </div>

        {/* Commit rows, newest first */}
        {commits.map((c) => (
          <div
            key={c.id}
            className={rowClass(selection === c.id)}
            onClick={() => onSelect(c.id)}
          >
            <div className="flex items-center gap-2 text-[13px] font-semibold text-zinc-900 dark:text-zinc-50">
              <span className="text-[11px] font-normal text-zinc-400">v{c.v}</span>
              <span className="truncate">{c.message}</span>
              {c.id === liveCommitId && (
                <span className="rounded-full bg-emerald-500 px-1.5 text-[9px] font-bold uppercase tracking-wide text-white">
                  live
                </span>
              )}
            </div>
            <div className="mt-0.5 text-[11px] text-zinc-500">
              {fmt(c.createdAt)}
            </div>
            {selection === c.id && (
              <div
                className="mt-2 flex gap-1.5"
                onClick={(e) => e.stopPropagation()}
              >
                {c.id === liveCommitId ? (
                  <button className={tinyBtn} disabled={busy} onClick={onUnpublish}>
                    Unpublish
                  </button>
                ) : (
                  <button
                    className={`${tinyPrimary} ${c.id === pulseId ? "animate-pulse" : ""}`}
                    disabled={busy}
                    onClick={() => onMakeLive(c.id)}
                  >
                    Make live
                  </button>
                )}
                <button
                  className={tinyBtn}
                  disabled={busy}
                  onClick={() => onRestore(c)}
                >
                  Restore
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </aside>
  );
};

export { Timeline };
