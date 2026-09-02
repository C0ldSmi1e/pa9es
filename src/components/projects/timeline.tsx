"use client";

import { useEffect, useRef, useState } from "react";
import type { CommitSummary } from "@/src/schemas/project";

const rowClass = (selected: boolean) =>
  `cursor-pointer border-b border-edge px-3 py-2.5 transition-colors ${
    selected
      ? "bg-panel-2 shadow-[inset_2px_0_0_var(--color-accent)]"
      : "hover:bg-ground"
  }`;

const tinyBtn =
  "rounded-md border border-edge px-2.5 py-1 text-xs font-medium text-ink " +
  "transition-colors hover:border-faint disabled:opacity-40";
const tinyPrimary =
  "rounded-md bg-ink px-2.5 py-1 text-xs font-medium text-panel " +
  "transition hover:opacity-85 disabled:opacity-40";

const fmt = (iso: string) =>
  new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

const Timeline = ({
  commits,
  liveCommitId,
  selection,
  uncommitted,
  busy,
  commitBlocked,
  pulseId,
  onSelect,
  onCommit,
  onSuggestMessage,
  onMakeLive,
  onUnpublish,
  onRestore,
}: {
  commits: CommitSummary[];
  liveCommitId: string | null;
  selection: string;
  uncommitted: boolean;
  busy: boolean;
  commitBlocked: string | null;
  pulseId: string | null;
  onSelect: (selection: string) => void;
  onCommit: (message: string) => Promise<boolean>;
  onSuggestMessage: () => Promise<string | null>;
  onMakeLive: (commitId: string) => void;
  onUnpublish: () => void;
  onRestore: (commit: CommitSummary) => void;
}) => {
  const [committing, setCommitting] = useState(false);
  const [message, setMessage] = useState("");
  const [messageMissing, setMessageMissing] = useState(false);
  const [suggesting, setSuggesting] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (committing) inputRef.current?.focus();
  }, [committing]);

  const suggest = async () => {
    setSuggesting(true);
    const suggestion = await onSuggestMessage();
    if (suggestion !== null) {
      setMessage(suggestion);
      setMessageMissing(false);
      inputRef.current?.focus();
    }
    setSuggesting(false);
  };

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
    <aside className="flex w-72 shrink-0 flex-col border-l border-edge bg-panel">
      <div className="border-b border-edge px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.1em] text-dim">
        Timeline
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto">
        {/* Draft row — the worktree */}
        <div
          className={rowClass(selection === "draft")}
          onClick={() => onSelect("draft")}
        >
          <div className="flex items-center gap-2 text-[13px] font-semibold text-ink">
            <span className={uncommitted ? "text-accent" : "text-faint"}>●</span>{" "}
            Draft
          </div>
          <div className="mt-0.5 text-[11px] text-dim">
            {commits.length === 0
              ? "no commits yet"
              : uncommitted
                ? "uncommitted changes"
                : `same as v${latest.v}`}
          </div>
          {selection === "draft" && (
            <div className="mt-2" onClick={(e) => e.stopPropagation()}>
              {committing ? (
                <>
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
                    className={`w-full rounded-md border bg-panel px-2 py-1 text-xs text-ink outline-none ${
                      messageMissing
                        ? "border-danger placeholder:text-danger/60"
                        : "border-accent placeholder:text-faint"
                    }`}
                    maxLength={200}
                  />
                  <button
                    className="mt-1 font-mono text-[11px] text-dim transition-colors hover:text-accent disabled:opacity-50"
                    disabled={busy || suggesting}
                    onClick={() => void suggest()}
                  >
                    {suggesting ? "✨ thinking…" : "✨ suggest message"}
                  </button>
                </>
              ) : (
                <button
                  className={tinyPrimary}
                  disabled={busy || !uncommitted || commitBlocked !== null}
                  onClick={() => setCommitting(true)}
                >
                  Commit
                </button>
              )}
              {commitBlocked && (
                <div className="mt-1 text-[11px] text-danger">{commitBlocked}</div>
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
            <div className="flex items-center gap-2 text-[13px] font-semibold text-ink">
              <span className="font-mono text-[11px] font-normal text-dim">
                v{c.v}
              </span>
              <span className="truncate">{c.message}</span>
              {c.id === liveCommitId && (
                <span className="rounded-full border border-live/40 px-1.5 font-mono text-[9px] font-semibold uppercase tracking-wide text-live">
                  live
                </span>
              )}
            </div>
            <div className="mt-0.5 font-mono text-[11px] text-dim">
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
