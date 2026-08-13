"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { content } from "@/src/config/constants";
import { api } from "@/src/lib/api";
import type {
  CommitDetail,
  CommitSummary,
  ProjectDetail,
} from "@/src/schemas/project";
import { CodeEditor } from "@/src/components/projects/code-editor";
import { IconPicker } from "@/src/components/projects/icon-picker";
import { PreviewPane } from "@/src/components/projects/preview-pane";
import { Timeline } from "@/src/components/projects/timeline";

type SaveState = "saved" | "saving" | "error";
type Prefs = {
  vim: boolean;
  wrap: boolean;
  showEditor: boolean;
  showPreview: boolean;
  showTimeline: boolean;
};

const DEFAULT_PREFS: Prefs = {
  vim: false,
  wrap: true,
  showEditor: true,
  showPreview: true,
  showTimeline: true,
};

const PREFS_KEY = "pa9es.editor";

// The server enforces the limit in UTF-8 bytes (what SQLite stores), so the
// editor must measure the same way — string length undercounts multibyte.
const textEncoder = new TextEncoder();
const draftByteSize = (value: string): number => textEncoder.encode(value).length;

const formatBytes = (n: number): string =>
  n >= 1024 * 1024
    ? `${(n / (1024 * 1024)).toFixed(1).replace(/\.0$/, "")} MB`
    : `${Math.ceil(n / 1024)} KB`;

const Editor = ({
  initial,
  initialCommits,
  liveUrl,
}: {
  initial: ProjectDetail;
  initialCommits: CommitSummary[];
  liveUrl: string;
}) => {
  const [title, setTitle] = useState(initial.title);
  const [iconEmoji, setIconEmoji] = useState(initial.iconEmoji);
  const [commits, setCommits] = useState(initialCommits);
  const [liveCommitId, setLiveCommitId] = useState(initial.liveCommitId);
  const [uncommitted, setUncommitted] = useState(initial.uncommitted);
  const [selection, setSelection] = useState<string>("draft");
  const [saveState, setSaveState] = useState<SaveState>("saved");
  const [draftBytes, setDraftBytes] = useState(() =>
    draftByteSize(initial.draftHtml),
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pulseId, setPulseId] = useState<string | null>(null);
  const [restoreTarget, setRestoreTarget] = useState<CommitSummary | null>(null);
  const [preview, setPreview] = useState({
    html: initial.draftHtml,
    label: "Draft",
  });
  const [draft, setDraft] = useState(initial.draftHtml);
  const [prefs, setPrefs] = useState<Prefs>(DEFAULT_PREFS);
  const [gearOpen, setGearOpen] = useState(false);

  // Refs so timers and Monaco callbacks always see current values.
  const draftRef = useRef(initial.draftHtml);
  const titleRef = useRef(initial.title);
  const syncedDraftRef = useRef(initial.draftHtml);
  const syncedTitleRef = useRef(initial.title);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const previewTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Resolves when saving has settled: synced, or blocked (oversize/failed).
  const inFlightRef = useRef<Promise<void> | null>(null);
  const selectionRef = useRef("draft");
  const commitHtmlCache = useRef(new Map<string, string>());
  const editorPaneRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    selectionRef.current = selection;
  }, [selection]);

  // Load stored prefs after mount (deferred: first paint uses defaults on
  // both server and client, so hydration stays consistent). setTimeout, not
  // requestAnimationFrame — rAF never fires in hidden tabs.
  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        const stored = localStorage.getItem(PREFS_KEY);
        if (stored) setPrefs({ ...DEFAULT_PREFS, ...JSON.parse(stored) });
      } catch {
        // corrupted prefs are ignored
      }
    }, 0);
    return () => clearTimeout(timer);
  }, []);
  const updatePrefs = (next: Partial<Prefs>) => {
    setPrefs((prev) => {
      const merged = { ...prev, ...next };
      localStorage.setItem(PREFS_KEY, JSON.stringify(merged));
      return merged;
    });
  };

  // At least one of editor/preview stays visible.
  const togglePane = (key: "showEditor" | "showPreview" | "showTimeline") => {
    const next: Partial<Prefs> = { [key]: !prefs[key] };
    if (key === "showEditor" && prefs.showEditor && !prefs.showPreview) {
      next.showPreview = true;
    }
    if (key === "showPreview" && prefs.showPreview && !prefs.showEditor) {
      next.showEditor = true;
    }
    updatePrefs(next);
  };

  // ── autosave: debounced PATCH; latest wins; explicit error state ──
  // Returns a promise that settles only when saving is done: refs synced, or
  // blocked (over the size limit / request failed). Concurrent callers join
  // the same run instead of skipping.
  const flushSave = useCallback((): Promise<void> => {
    if (inFlightRef.current) return inFlightRef.current;

    const run = (async () => {
      // Latest wins: keep saving until the refs are clean or we can't proceed.
      while (
        draftRef.current !== syncedDraftRef.current ||
        titleRef.current !== syncedTitleRef.current
      ) {
        const body: { draftHtml?: string; title?: string } = {};
        if (draftRef.current !== syncedDraftRef.current)
          body.draftHtml = draftRef.current;
        if (titleRef.current !== syncedTitleRef.current)
          body.title = titleRef.current;

        // Over-limit drafts can never succeed server-side — skip the upload
        // instead of burning a request per debounce to learn the same. The
        // timeline's "file too large" hint carries the reason.
        if (body.draftHtml !== undefined) {
          const bytes = draftByteSize(body.draftHtml);
          setDraftBytes(bytes);
          if (bytes > content.maxHtmlBytes) {
            setSaveState("error");
            return;
          }
        }

        setSaveState("saving");
        const detail = await api<ProjectDetail>(`/api/projects/${initial.id}`, {
          method: "PATCH",
          body: JSON.stringify(body),
        });
        if (body.draftHtml !== undefined) syncedDraftRef.current = body.draftHtml;
        if (body.title !== undefined) syncedTitleRef.current = body.title;
        setUncommitted(detail.uncommitted);
      }
      setSaveState("saved");
    })();

    inFlightRef.current = run
      .catch(() => setSaveState("error"))
      .finally(() => {
        inFlightRef.current = null;
      });
    return inFlightRef.current;
  }, [initial.id]);

  const scheduleSave = useCallback(() => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => void flushSave(), 1200);
  }, [flushSave]);

  // Flush pending edits when the tab hides.
  useEffect(() => {
    const onHide = () => {
      if (document.visibilityState === "hidden") void flushSave();
    };
    document.addEventListener("visibilitychange", onHide);
    return () => document.removeEventListener("visibilitychange", onHide);
  }, [flushSave]);

  const onDraftChange = (value: string) => {
    draftRef.current = value;
    setDraft(value);
    setUncommitted(true);
    setError(null);
    if (selectionRef.current !== "draft") setSelection("draft");
    scheduleSave();
    if (previewTimerRef.current) clearTimeout(previewTimerRef.current);
    previewTimerRef.current = setTimeout(() => {
      setDraftBytes(draftByteSize(draftRef.current));
      if (selectionRef.current === "draft") {
        setPreview({ html: draftRef.current, label: "Draft" });
      }
    }, 400);
  };

  const onTitleChange = (value: string) => {
    setTitle(value);
    titleRef.current = value;
    scheduleSave();
  };

  // Optimistic; separate from the draft autosave (a null must reach the
  // server, and the debounce would let icon and draft changes clobber each
  // other's PATCH bodies). The sequence ref drops out-of-order responses —
  // the Random button can fire re-rolls faster than PATCHes complete.
  const iconRequestRef = useRef(0);
  const doSetIcon = async (next: string | null) => {
    const requestId = ++iconRequestRef.current;
    const previous = iconEmoji;
    setIconEmoji(next);
    setError(null);
    try {
      const detail = await api<ProjectDetail>(`/api/projects/${initial.id}`, {
        method: "PATCH",
        body: JSON.stringify({ iconEmoji: next }),
      });
      if (requestId === iconRequestRef.current) setIconEmoji(detail.iconEmoji);
    } catch (requestError) {
      if (requestId !== iconRequestRef.current) return;
      setIconEmoji(previous);
      setError(
        requestError instanceof Error ? requestError.message : "Icon update failed",
      );
    }
  };

  // ── selection drives the preview ──
  const select = useCallback(
    async (next: string) => {
      setSelection(next);
      if (next === "draft") {
        setPreview({ html: draftRef.current, label: "Draft" });
        return;
      }
      const c = commits.find((x) => x.id === next);
      if (!c) return;
      const label = `v${c.v}${c.id === liveCommitId ? " · live" : ""}`;
      let html = commitHtmlCache.current.get(next);
      if (html === undefined) {
        setPreview({ html: "", label });
        try {
          const detail = await api<CommitDetail>(
            `/api/projects/${initial.id}/commits/${next}`,
          );
          html = detail.html;
          commitHtmlCache.current.set(next, html);
        } catch {
          setError("Failed to load commit");
          return;
        }
      }
      if (selectionRef.current === next) setPreview({ html, label });
    },
    [commits, liveCommitId, initial.id],
  );

  // ── timeline actions ──
  const doCommit = async (message: string): Promise<boolean> => {
    setBusy(true);
    setError(null);
    try {
      // Joins any in-flight autosave; resolves only when saving has settled.
      await flushSave();
      // The server snapshots ITS draft, not the editor's. Committing while
      // out of sync would silently publish stale content.
      if (
        draftRef.current !== syncedDraftRef.current ||
        titleRef.current !== syncedTitleRef.current
      ) {
        setError("Draft isn't saved — resolve the save error before committing");
        return false;
      }
      const wasEmptyTimeline = commits.length === 0;
      const summary = await api<CommitSummary>(
        `/api/projects/${initial.id}/commits`,
        { method: "POST", body: JSON.stringify({ message }) },
      );
      commitHtmlCache.current.set(summary.id, draftRef.current);
      setCommits((prev) => [summary, ...prev]);
      setUncommitted(false);
      if (wasEmptyTimeline && liveCommitId === null) {
        setPulseId(summary.id);
        void select(summary.id);
      }
      return true;
    } catch (requestError) {
      setError(
        requestError instanceof Error ? requestError.message : "Commit failed",
      );
      return false;
    } finally {
      setBusy(false);
    }
  };

  const doMakeLive = async (commitId: string) => {
    setBusy(true);
    setError(null);
    try {
      const detail = await api<ProjectDetail>(`/api/projects/${initial.id}/live`, {
        method: "POST",
        body: JSON.stringify({ commitId }),
      });
      setLiveCommitId(detail.liveCommitId);
      setPulseId(null);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Failed");
    } finally {
      setBusy(false);
    }
  };

  const doUnpublish = async () => {
    setBusy(true);
    setError(null);
    try {
      const detail = await api<ProjectDetail>(`/api/projects/${initial.id}/live`, {
        method: "DELETE",
      });
      setLiveCommitId(detail.liveCommitId);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Failed");
    } finally {
      setBusy(false);
    }
  };

  const requestRestore = (c: CommitSummary) => {
    if (uncommitted) {
      setRestoreTarget(c);
    } else {
      void doRestore(c.id);
    }
  };

  const doRestore = async (commitId: string) => {
    setRestoreTarget(null);
    setBusy(true);
    setError(null);
    try {
      const detail = await api<ProjectDetail>(
        `/api/projects/${initial.id}/restore`,
        { method: "POST", body: JSON.stringify({ commitId }) },
      );
      draftRef.current = detail.draftHtml;
      syncedDraftRef.current = detail.draftHtml;
      setDraft(detail.draftHtml);
      setDraftBytes(draftByteSize(detail.draftHtml));
      setUncommitted(detail.uncommitted);
      setSaveState("saved");
      setSelection("draft");
      setPreview({ html: detail.draftHtml, label: "Draft" });
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Failed");
    } finally {
      setBusy(false);
    }
  };

  // ── status chip ──
  const live = commits.find((c) => c.id === liveCommitId) ?? null;
  const latest = commits[0] ?? null;
  const statusText = !live
    ? latest
      ? `Not live · latest v${latest.v}`
      : "Not live"
    : live.id === latest?.id
      ? `Live · v${live.v}`
      : `Live v${live.v}`;
  const behind = Boolean(live && latest && live.id !== latest.id);

  // ── draggable divider between editor and preview ──
  const onDividerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    const divider = e.currentTarget;
    divider.setPointerCapture(e.pointerId);
    const container = divider.parentElement;
    if (!container) return;
    const move = (ev: PointerEvent) => {
      const rect = container.getBoundingClientRect();
      const pct = ((ev.clientX - rect.left) / rect.width) * 100;
      if (editorPaneRef.current) {
        editorPaneRef.current.style.flexBasis = `${Math.min(70, Math.max(20, pct))}%`;
      }
    };
    const up = () => {
      divider.removeEventListener("pointermove", move);
      divider.removeEventListener("pointerup", up);
    };
    divider.addEventListener("pointermove", move);
    divider.addEventListener("pointerup", up);
  };

  return (
    <div className="flex h-screen flex-col bg-ground font-sans">
      <header className="relative flex shrink-0 items-center gap-3 border-b border-edge bg-panel px-4 py-2">
        <Link
          href="/app"
          className="shrink-0 text-sm text-dim transition-colors hover:text-ink"
        >
          ← Pages
        </Link>
        <IconPicker value={iconEmoji} onSelect={(next) => void doSetIcon(next)} />
        <input
          value={title}
          onChange={(e) => onTitleChange(e.target.value)}
          maxLength={100}
          className="w-40 rounded-md border border-transparent bg-transparent px-2 py-1 text-sm font-semibold text-ink outline-none hover:border-edge focus:border-accent"
        />
        {error && (
          <span className="truncate text-xs text-danger" role="alert">
            {error}
          </span>
        )}
        <span className="flex-1" />
        <span className="flex items-center gap-1.5 font-mono text-xs text-dim">
          <span
            className={`h-1.5 w-1.5 rounded-full ${live ? "bg-live" : "bg-faint"}`}
          />
          {live ? (
            <a
              href={liveUrl}
              target="_blank"
              rel="noreferrer"
              className="text-live hover:underline"
            >
              {statusText} ↗
            </a>
          ) : (
            <span>{statusText}</span>
          )}
          {behind && latest && (
            <span className="font-medium text-accent">· latest v{latest.v}</span>
          )}
          {saveState === "saving" && <span>· Saving…</span>}
          {saveState === "error" && (
            <span className="font-medium text-danger">· Not saved</span>
          )}
        </span>
        <span className="flex overflow-hidden rounded-md border border-edge font-mono text-[11px]">
          {(
            [
              ["showEditor", "code"],
              ["showPreview", "preview"],
              ["showTimeline", "timeline"],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              onClick={() => togglePane(key)}
              className={`px-2.5 py-1 transition-colors ${
                prefs[key] ? "bg-ink text-panel" : "text-dim hover:text-ink"
              }`}
            >
              {label}
            </button>
          ))}
        </span>
        <button
          onClick={() => setGearOpen((v) => !v)}
          title="Editor settings"
          className="shrink-0 rounded-md border border-edge px-2 py-1 text-xs text-dim transition-colors hover:text-ink"
        >
          ⚙
        </button>
        {gearOpen && (
          <div className="absolute right-3 top-11 z-20 w-44 rounded-xl border border-edge bg-panel p-2 shadow-lg">
            <label className="flex cursor-pointer items-center gap-2 px-1 py-1 text-sm text-ink">
              <input
                type="checkbox"
                checked={prefs.vim}
                onChange={(e) => updatePrefs({ vim: e.target.checked })}
              />
              Vim mode
            </label>
            <label className="flex cursor-pointer items-center gap-2 px-1 py-1 text-sm text-ink">
              <input
                type="checkbox"
                checked={prefs.wrap}
                onChange={(e) => updatePrefs({ wrap: e.target.checked })}
              />
              Line wrap
            </label>
          </div>
        )}
      </header>

      <div className="flex min-h-0 flex-1">
        <div
          ref={editorPaneRef}
          className={`min-w-[180px] flex-col ${prefs.showEditor ? "flex" : "hidden"}`}
          style={{ flexBasis: prefs.showPreview ? "44%" : "100%" }}
        >
          <CodeEditor
            value={draft}
            onChange={onDraftChange}
            onSave={() => {
              if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
              void flushSave();
            }}
            wrap={prefs.wrap}
            vim={prefs.vim}
          />
        </div>
        {prefs.showEditor && prefs.showPreview && (
          <div
            onPointerDown={onDividerDown}
            className="w-1.5 shrink-0 cursor-col-resize bg-edge transition-colors hover:bg-accent"
          />
        )}
        {prefs.showPreview && (
          <PreviewPane html={preview.html} label={preview.label} />
        )}
        {prefs.showTimeline && (
          <Timeline
            commits={commits}
            liveCommitId={liveCommitId}
            selection={selection}
            uncommitted={uncommitted}
            busy={busy}
            commitBlocked={
              draftBytes > content.maxHtmlBytes
                ? `Too large: ${formatBytes(draftBytes)} / ${formatBytes(content.maxHtmlBytes)}`
                : null
            }
            pulseId={pulseId}
            onSelect={(next) => void select(next)}
            onCommit={doCommit}
            onMakeLive={(id) => void doMakeLive(id)}
            onUnpublish={() => void doUnpublish()}
            onRestore={requestRestore}
          />
        )}
      </div>

      {restoreTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-ink/30"
          onClick={() => setRestoreTarget(null)}
        >
          <div
            className="w-80 rounded-xl border border-edge bg-panel p-5 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 text-sm font-semibold text-ink">
              Overwrite uncommitted changes?
            </div>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setRestoreTarget(null)}
                className="rounded-md border border-edge px-3 py-1.5 text-xs font-medium text-dim"
              >
                Cancel
              </button>
              <button
                onClick={() => void doRestore(restoreTarget.id)}
                className="rounded-md border border-danger px-3 py-1.5 text-xs font-medium text-danger transition-colors hover:bg-danger hover:text-white"
              >
                Restore
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export { Editor };
