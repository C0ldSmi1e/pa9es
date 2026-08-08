"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/src/lib/api";
import { slugSchema } from "@/src/schemas/project";
import type { ProjectDetail } from "@/src/schemas/project";

const inputClass =
  "w-full rounded-md border border-zinc-300 px-3 py-2 text-sm outline-none " +
  "focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-900 dark:focus:border-zinc-400";

const CreateProjectForm = () => {
  const router = useRouter();
  const [slug, setSlug] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const normalized = slug.trim().toLowerCase();
  const slugIssue = useMemo(() => {
    if (normalized === "") return null;
    const result = slugSchema.safeParse(normalized);
    return result.success ? null : result.error.issues[0].message;
  }, [normalized]);

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const project = await api<ProjectDetail>("/api/projects", {
        method: "POST",
        body: JSON.stringify({ slug: normalized }),
      });
      router.push(`/app/projects/${project.id}`);
    } catch (createError) {
      setError(
        createError instanceof Error ? createError.message : "Creation failed",
      );
      setSubmitting(false);
    }
  };

  return (
    <form
      onSubmit={onSubmit}
      className="space-y-2 rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950"
    >
      <div className="flex gap-2">
        <input
          className={inputClass}
          placeholder="page-name"
          value={slug}
          onChange={(e) => setSlug(e.target.value)}
          required
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
        />
        <button
          type="submit"
          disabled={submitting || slugIssue !== null || normalized === ""}
          className="shrink-0 rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-50 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-300"
        >
          {submitting ? "Creating…" : "Create page"}
        </button>
      </div>
      {slugIssue && (
        <p className="text-xs text-red-600 dark:text-red-400">{slugIssue}</p>
      )}
      {error && (
        <p className="text-sm text-red-600 dark:text-red-400" role="alert">
          {error}
        </p>
      )}
    </form>
  );
};

export { CreateProjectForm };
