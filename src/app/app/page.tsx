import Link from "next/link";
import { redirect } from "next/navigation";
import { listProjects } from "@/src/server/actions/projects";
import { CreateProjectForm } from "@/src/components/projects/create-project-form";
import { DeleteProjectButton } from "@/src/components/projects/delete-project-button";
import { SignOutButton } from "@/src/components/auth/sign-out-button";
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

  return (
    <main className="min-h-screen bg-zinc-50 font-sans dark:bg-black">
      <div className="mx-auto max-w-2xl space-y-6 p-6">
        <header className="flex items-center justify-between">
          <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
            pa9es
          </h1>
          <div className="flex items-center gap-3">
            <span className="text-sm text-zinc-500">
              {session.user.username ?? session.user.email}
            </span>
            <div className="w-24">
              <SignOutButton />
            </div>
          </div>
        </header>

        <CreateProjectForm />

        <section className="space-y-2">
          {projects.length === 0 ? (
            <p className="rounded-xl border border-dashed border-zinc-300 p-6 text-center text-sm text-zinc-500 dark:border-zinc-700">
              No projects yet — create your first page above.
            </p>
          ) : (
            projects.map((project) => (
              <div
                key={project.id}
                className="flex items-center justify-between gap-3 rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950"
              >
                <Link
                  href={`/app/projects/${project.id}`}
                  className="min-w-0 flex-1"
                >
                  <div className="truncate text-sm font-medium text-zinc-900 dark:text-zinc-50">
                    {project.title}
                  </div>
                  <div className="truncate text-xs text-zinc-500">
                    /{project.slug} · {project.isPublished ? "Live" : "Not live"}
                  </div>
                </Link>
                <DeleteProjectButton projectId={project.id} />
              </div>
            ))
          )}
        </section>
      </div>
    </main>
  );
};

export default AppPage;
