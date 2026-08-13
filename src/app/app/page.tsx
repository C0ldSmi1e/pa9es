import Link from "next/link";
import { redirect } from "next/navigation";
import { listProjects } from "@/src/server/actions/projects";
import { CreateProjectForm } from "@/src/components/projects/create-project-form";
import { DeleteProjectButton } from "@/src/components/projects/delete-project-button";
import { SignOutButton } from "@/src/components/auth/sign-out-button";
import { app } from "@/src/server/env";
import { getSession } from "@/src/server/session";

type PageProps = { searchParams: Promise<{ error?: string }> };

const AppPage = async ({ searchParams }: PageProps) => {
  const session = await getSession();
  if (!session) {
    // Verification links use /app as their callbackURL, so a failed link
    // (expired/invalid token) lands here signed-out with an error code —
    // carry it to the login page's notice instead of dropping it.
    const { error } = await searchParams;
    redirect(error ? `/login?error=${encodeURIComponent(error)}` : "/login");
  }

  const { data: projects } = await listProjects({ userId: session.user.id });
  const urlPrefix = `${session.user.username ?? "you"}.${app.rootDomain}/`;

  return (
    <main className="min-h-screen bg-ground font-sans">
      <div className="mx-auto max-w-2xl px-6 py-8">
        <header className="flex items-baseline justify-between border-b border-edge pb-4">
          <span className="font-mono text-base text-ink">
            pa<b className="font-semibold text-accent">9</b>es
          </span>
          <div className="flex items-baseline gap-4 text-sm">
            <span className="font-mono text-xs text-dim">
              {session.user.username ?? session.user.email}
            </span>
            <Link
              href="/app/settings"
              className="text-dim transition-colors hover:text-ink"
            >
              Settings
            </Link>
            <SignOutButton />
          </div>
        </header>

        <div className="mb-7 mt-6">
          <CreateProjectForm urlPrefix={urlPrefix} />
        </div>

        {projects.length === 0 ? (
          <p className="rounded-xl border border-dashed border-faint p-8 text-center text-sm text-dim">
            No pages yet — name one above and start typing.
          </p>
        ) : (
          <ul className="divide-y divide-edge border-y border-edge">
            {projects.map((project) => (
              <li key={project.id} className="flex items-center gap-2">
                <Link
                  href={`/app/projects/${project.id}`}
                  className="flex min-w-0 flex-1 items-baseline justify-between gap-3 px-2.5 py-3.5 transition-colors hover:bg-panel"
                >
                  <span className="min-w-0 truncate">
                    {project.iconEmoji && (
                      <span className="mr-1.5">{project.iconEmoji}</span>
                    )}
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
                <DeleteProjectButton projectId={project.id} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  );
};

export default AppPage;
