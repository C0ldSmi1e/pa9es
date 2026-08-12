import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { PreviewPane } from "@/src/components/projects/preview-pane";
import {
  adminGetProject,
  adminListCommitsForProject,
} from "@/src/server/actions/admin";
import { app, authConfig } from "@/src/server/env";
import { NotFoundError } from "@/src/server/errors";
import { getSession } from "@/src/server/session";

type PageProps = {
  params: Promise<{ projectId: string }>;
  searchParams: Promise<{ view?: string }>;
};

const toggleClass = (active: boolean) =>
  `px-2.5 py-1 transition-colors ${
    active ? "bg-ink text-panel" : "text-dim hover:text-ink"
  }`;

const fmt = (iso: string) => `${iso.slice(0, 10)} ${iso.slice(11, 16)}`;

// Read-only inspection of any user's project: rendered preview (in the same
// sandboxed iframe the editor uses — user HTML never runs same-origin) plus
// the commit timeline. No mutations here; moderation is the ban button.
const AdminProjectPage = async ({ params, searchParams }: PageProps) => {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }
  if (session.user.role !== "admin") {
    notFound();
  }

  const { projectId } = await params;
  const { view } = await searchParams;
  const actorRole = session.user.role;
  let project;
  let commits;
  try {
    project = await adminGetProject({ actorRole, projectId });
    commits = await adminListCommitsForProject({ actorRole, projectId });
  } catch (error) {
    if (error instanceof NotFoundError) {
      notFound();
    }
    throw error;
  }

  // Default to what visitors see; fall back to the draft when nothing is live.
  const showPublished = project.isPublished && view !== "draft";
  const previewHtml = showPublished
    ? (project.publishedHtml ?? "")
    : project.draftHtml;

  const protocol = new URL(authConfig.url).protocol;
  const liveUrl =
    project.owner.username && project.isPublished
      ? `${protocol}//${project.owner.username}.${app.rootDomain}/${project.slug}`
      : null;

  return (
    <div className="flex h-screen flex-col bg-ground font-sans">
      <header className="flex shrink-0 items-center gap-3 border-b border-edge bg-panel px-4 py-2">
        <Link
          href={`/admin/users/${project.owner.id}`}
          className="shrink-0 text-sm text-dim transition-colors hover:text-ink"
        >
          ← {project.owner.username ?? project.owner.email}
        </Link>
        <span className="truncate text-sm font-semibold text-ink">
          {project.title}
        </span>
        <span className="shrink-0 font-mono text-xs text-dim">/{project.slug}</span>
        <span className="flex-1" />
        <span className="flex items-center gap-1.5 font-mono text-xs text-dim">
          <span
            className={`h-1.5 w-1.5 rounded-full ${
              project.isPublished ? "bg-live" : "bg-faint"
            }`}
          />
          {liveUrl ? (
            <a
              href={liveUrl}
              target="_blank"
              rel="noreferrer"
              className="text-live hover:underline"
            >
              live ↗
            </a>
          ) : (
            <span>not live</span>
          )}
        </span>
        {project.isPublished && (
          <span className="flex overflow-hidden rounded-md border border-edge font-mono text-[11px]">
            <Link href="?view=published" className={toggleClass(showPublished)}>
              published
            </Link>
            <Link href="?view=draft" className={toggleClass(!showPublished)}>
              draft
            </Link>
          </span>
        )}
      </header>

      <div className="flex min-h-0 flex-1">
        <PreviewPane
          html={previewHtml}
          label={showPublished ? "Published" : "Draft"}
        />
        <aside className="flex w-72 shrink-0 flex-col border-l border-edge bg-panel">
          <div className="border-b border-edge px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.1em] text-dim">
            Timeline
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto">
            {commits.length === 0 ? (
              <p className="px-3 py-4 text-xs text-dim">No commits yet.</p>
            ) : (
              commits.map((commit) => (
                <div key={commit.id} className="border-b border-edge px-3 py-2.5">
                  <div className="flex items-center gap-2 text-[13px] font-semibold text-ink">
                    <span className="font-mono text-[11px] font-normal text-dim">
                      v{commit.v}
                    </span>
                    <span className="truncate">{commit.message}</span>
                    {commit.id === project.liveCommitId && (
                      <span className="rounded-full border border-live/40 px-1.5 font-mono text-[9px] font-semibold uppercase tracking-wide text-live">
                        live
                      </span>
                    )}
                  </div>
                  <div className="mt-0.5 font-mono text-[11px] text-dim">
                    {fmt(commit.createdAt)}
                  </div>
                </div>
              ))
            )}
          </div>
        </aside>
      </div>
    </div>
  );
};

export default AdminProjectPage;
