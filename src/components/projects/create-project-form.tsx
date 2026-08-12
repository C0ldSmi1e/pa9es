"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/src/lib/api";
import { slugSchema } from "@/src/schemas/project";
import type { ProjectDetail } from "@/src/schemas/project";

const CreateProjectForm = ({ urlPrefix }: { urlPrefix: string }) => {
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
    <form onSubmit={onSubmit} className="space-y-2">
      <div className="flex gap-2.5">
        <span className="flex min-w-0 flex-1 items-center overflow-hidden rounded-lg border border-edge bg-panel px-3 font-mono text-sm transition-colors focus-within:border-accent">
          <span className="shrink-0 text-faint">{urlPrefix}</span>
          <input
            className="min-w-0 flex-1 bg-transparent py-2 pl-px text-ink outline-none placeholder:text-faint"
            placeholder="new-page"
            aria-label="New page slug"
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            required
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
          />
        </span>
        <button
          type="submit"
          disabled={submitting || slugIssue !== null || normalized === ""}
          className="shrink-0 rounded-lg border border-edge bg-panel px-4 py-2 text-sm font-medium text-ink transition-colors hover:border-faint disabled:opacity-50"
        >
          {submitting ? "Creating…" : "Create"}
        </button>
      </div>
      {slugIssue && <p className="text-xs text-danger">{slugIssue}</p>}
      {error && (
        <p className="text-sm text-danger" role="alert">
          {error}
        </p>
      )}
    </form>
  );
};

export { CreateProjectForm };
