import Link from "next/link";
import { redirect } from "next/navigation";
import { formatCredits } from "@/src/lib/credits";
import { getBalance } from "@/src/server/actions/credits";
import { listProjects } from "@/src/server/actions/projects";
import { CreateProjectForm } from "@/src/components/projects/create-project-form";
import { ProjectList } from "@/src/components/projects/project-list";
import { SignOutButton } from "@/src/components/auth/sign-out-button";
import { app, authConfig } from "@/src/server/env";
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
  const { balance } = await getBalance({ userId: session.user.id });
  const urlPrefix = `${session.user.username ?? "you"}.${app.rootDomain}/`;
  // Live links use the canonical protocol, same as the editor's status chip.
  const protocol = new URL(authConfig.url).protocol;
  const liveUrlPrefix = session.user.username
    ? `${protocol}//${session.user.username}.${app.rootDomain}/`
    : null;

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
              title="Credit balance"
              className="font-mono text-xs text-dim transition-colors hover:text-ink"
            >
              {formatCredits(balance)} credits
            </Link>
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
          <ProjectList projects={projects} liveUrlPrefix={liveUrlPrefix} />
        )}
      </div>
    </main>
  );
};

export default AppPage;
