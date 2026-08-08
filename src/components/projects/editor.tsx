"use client";

import { useState } from "react";
import Link from "next/link";
import { api } from "@/src/lib/api";
import type { ProjectDetail } from "@/src/schemas/project";

const buttonClass = "rounded-md px-3 py-1.5 text-sm font-medium disabled:opacity-50";

const Editor = ({
  initial,
  liveUrl,
}: {
  initial: ProjectDetail;
  liveUrl: string;
}) => {
  const [project, setProject] = useState(initial);
  const [title, setTitle] = useState(initial.title);
  const [draftHtml, setDraftHtml] = useState(initial.draftHtml);
  const [busy, setBusy] = useState<"save" | "publish" | "unpublish" | null>(null);
  const [error, setError] = useState<string | null>(null);

  const dirty = title !== project.title || draftHtml !== project.draftHtml;

  const run = async (kind: "save" | "publish" | "unpublish") => {
    setBusy(kind);
    setError(null);
    try {
      const updated =
        kind === "save"
          ? await api<ProjectDetail>(`/api/projects/${project.id}`, {
              method: "PATCH",
              body: JSON.stringify({ title, draftHtml }),
            })
          : await api<ProjectDetail>(`/api/projects/${project.id}/publish`, {
              method: kind === "publish" ? "POST" : "DELETE",
            });
      setProject(updated);
      setTitle(updated.title);
      setDraftHtml(updated.draftHtml);
    } catch (requestError) {
      setError(
        requestError instanceof Error ? requestError.message : "Request failed",
      );
    } finally {
      setBusy(null);
    }
  };

  return (
    <main className="min-h-screen bg-zinc-50 font-sans dark:bg-black">
      <div className="mx-auto flex min-h-screen max-w-3xl flex-col gap-4 p-6">
        <header className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <Link
              href="/app"
              className="shrink-0 text-sm text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
            >
              ← Projects
            </Link>
            <input
              className="w-full min-w-0 rounded-md border border-transparent bg-transparent px-2 py-1 text-sm font-medium text-zinc-900 outline-none hover:border-zinc-300 focus:border-zinc-500 dark:text-zinc-50 dark:hover:border-zinc-700"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={100}
            />
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <button
              onClick={() => run("save")}
              disabled={busy !== null || !dirty}
              className={`${buttonClass} border border-zinc-300 text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-900`}
            >
              {busy === "save" ? "Saving…" : dirty ? "Save draft" : "Saved"}
            </button>
            {project.isPublished ? (
              <>
                <button
                  onClick={() => run("publish")}
                  disabled={busy !== null}
                  className={`${buttonClass} bg-zinc-900 text-white hover:bg-zinc-700 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-300`}
                >
                  {busy === "publish" ? "Publishing…" : "Republish"}
                </button>
                <button
                  onClick={() => run("unpublish")}
                  disabled={busy !== null}
                  className={`${buttonClass} border border-zinc-300 text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-900`}
                >
                  {busy === "unpublish" ? "…" : "Unpublish"}
                </button>
              </>
            ) : (
              <button
                onClick={() => run("publish")}
                disabled={busy !== null}
                className={`${buttonClass} bg-zinc-900 text-white hover:bg-zinc-700 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-300`}
              >
                {busy === "publish" ? "Publishing…" : "Publish"}
              </button>
            )}
          </div>
        </header>

        <div className="flex items-center gap-2 text-xs text-zinc-500">
          <span
            className={`inline-block h-1.5 w-1.5 rounded-full ${
              project.isPublished ? "bg-emerald-500" : "bg-zinc-400"
            }`}
          />
          {project.isPublished ? (
            <>
              Live at{" "}
              <a
                href={liveUrl}
                target="_blank"
                rel="noreferrer"
                className="font-mono text-zinc-700 underline dark:text-zinc-300"
              >
                {liveUrl.replace(/^https?:\/\//, "")}
              </a>
              {project.hasUnpublishedChanges && !dirty && (
                <span className="text-amber-600 dark:text-amber-400">
                  · draft differs from live page
                </span>
              )}
            </>
          ) : (
            <>Draft — not published</>
          )}
          {dirty && <span>· unsaved changes</span>}
        </div>

        {error && (
          <p className="text-sm text-red-600 dark:text-red-400" role="alert">
            {error}
          </p>
        )}

        <textarea
          className="min-h-[420px] w-full flex-1 resize-y rounded-xl border border-zinc-200 bg-white p-4 font-mono text-sm text-zinc-900 outline-none focus:border-zinc-400 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100"
          value={draftHtml}
          onChange={(e) => setDraftHtml(e.target.value)}
          placeholder="<!doctype html>…"
          spellCheck={false}
        />
      </div>
    </main>
  );
};

export { Editor };
