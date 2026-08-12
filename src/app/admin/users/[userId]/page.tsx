import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { BanButton } from "@/src/components/admin/ban-button";
import { adminGetUser, adminListProjectsForUser } from "@/src/server/actions/admin";
import { app, authConfig } from "@/src/server/env";
import { NotFoundError } from "@/src/server/errors";
import { getSession } from "@/src/server/session";

type PageProps = { params: Promise<{ userId: string }> };

// Read-only admin view of one user's pages. Same 404-not-403 gating as /admin.
const AdminUserPage = async ({ params }: PageProps) => {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }
  if (session.user.role !== "admin") {
    notFound();
  }

  const { userId } = await params;
  const actorRole = session.user.role;
  let target;
  let projects;
  try {
    target = await adminGetUser({ actorRole, userId });
    projects = await adminListProjectsForUser({ actorRole, userId });
  } catch (error) {
    if (error instanceof NotFoundError) {
      notFound();
    }
    throw error;
  }

  const protocol = new URL(authConfig.url).protocol;

  return (
    <main className="min-h-screen bg-ground font-sans">
      <div className="mx-auto max-w-3xl space-y-5 px-6 py-8">
        <header className="flex items-baseline justify-between border-b border-edge pb-4">
          <div className="flex items-baseline gap-3">
            <h1 className="text-lg font-semibold tracking-tight text-ink">
              {target.username ?? target.name}
            </h1>
            {target.role === "admin" && (
              <span className="rounded bg-ink px-1.5 py-0.5 font-mono text-[10px] font-medium uppercase text-panel">
                admin
              </span>
            )}
            {target.banned && (
              <span className="rounded bg-danger/10 px-1.5 py-0.5 font-mono text-[10px] font-medium uppercase text-danger">
                banned
              </span>
            )}
            <span className="font-mono text-xs text-dim">
              {projects.length} page{projects.length === 1 ? "" : "s"}
            </span>
          </div>
          <Link
            href="/admin"
            className="text-sm text-dim transition-colors hover:text-ink"
          >
            ← Admin
          </Link>
        </header>

        <section className="rounded-xl border border-edge bg-panel p-5">
          <div className="flex items-start justify-between">
            <h2 className="font-mono text-[11px] uppercase tracking-[0.1em] text-dim">
              Account
            </h2>
            {target.id !== session.user.id && (
              <BanButton userId={target.id} banned={target.banned} />
            )}
          </div>
          <dl className="mt-3 space-y-1.5">
            <div className="flex items-baseline justify-between text-sm">
              <dt className="text-dim">username</dt>
              <dd className="font-mono text-xs text-ink">
                {target.username ?? "—"}
              </dd>
            </div>
            <div className="flex items-baseline justify-between text-sm">
              <dt className="text-dim">email</dt>
              <dd className="font-mono text-xs text-ink">{target.email}</dd>
            </div>
            <div className="flex items-baseline justify-between text-sm">
              <dt className="text-dim">joined</dt>
              <dd className="font-mono text-xs text-ink">
                {target.createdAt.slice(0, 10)}
              </dd>
            </div>
          </dl>
        </section>

        {projects.length === 0 ? (
          <p className="rounded-xl border border-dashed border-faint p-8 text-center text-sm text-dim">
            No pages.
          </p>
        ) : (
          <section className="divide-y divide-edge border-y border-edge">
            {projects.map((project) => {
              const liveUrl =
                target.username && project.isPublished
                  ? `${protocol}//${target.username}.${app.rootDomain}/${project.slug}`
                  : null;
              return (
                <div key={project.id} className="flex items-center gap-2 pr-2.5">
                  <Link
                    href={`/admin/projects/${project.id}`}
                    className="flex min-w-0 flex-1 items-baseline justify-between gap-3 px-2.5 py-3.5 transition-colors hover:bg-panel"
                  >
                    <span className="min-w-0 truncate">
                      <span className="text-sm font-medium text-ink">
                        {project.title}
                      </span>
                      <span className="ml-2.5 font-mono text-xs text-dim">
                        /{project.slug}
                      </span>
                    </span>
                    <span
                      className={`flex shrink-0 items-center gap-1.5 font-mono text-xs ${
                        project.isPublished ? "text-live" : "text-dim"
                      }`}
                    >
                      <span
                        className={`h-1.5 w-1.5 rounded-full ${
                          project.isPublished ? "bg-live" : "bg-faint"
                        }`}
                      />
                      {project.isPublished ? "live" : "draft"}
                    </span>
                  </Link>
                  {liveUrl && (
                    <a
                      href={liveUrl}
                      target="_blank"
                      rel="noreferrer"
                      title="Open the live page"
                      className="font-mono text-xs text-live hover:underline"
                    >
                      ↗
                    </a>
                  )}
                </div>
              );
            })}
          </section>
        )}
      </div>
    </main>
  );
};

export default AdminUserPage;
