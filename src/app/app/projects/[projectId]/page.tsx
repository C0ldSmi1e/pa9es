import { notFound, redirect } from "next/navigation";
import { Editor } from "@/src/components/projects/editor";
import { listCommits } from "@/src/server/actions/commits";
import { getProject } from "@/src/server/actions/projects";
import { app, authConfig } from "@/src/server/env";
import { NotFoundError } from "@/src/server/errors";
import { getSession } from "@/src/server/session";

type PageProps = { params: Promise<{ projectId: string }> };

const ProjectPage = async ({ params }: PageProps) => {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }

  const { projectId } = await params;
  let project;
  let commitList;
  try {
    project = await getProject({ userId: session.user.id, projectId });
    commitList = await listCommits({ userId: session.user.id, projectId });
  } catch (error) {
    if (error instanceof NotFoundError) {
      notFound();
    }
    throw error;
  }

  // Live URL uses the canonical protocol; the subdomain comes from the
  // signed-in user's username.
  const protocol = new URL(authConfig.url).protocol;
  const liveUrl = `${protocol}//${session.user.username}.${app.rootDomain}/${project.slug}`;

  return (
    <Editor
      initial={project}
      initialCommits={commitList.commits}
      liveUrl={liveUrl}
    />
  );
};

export default ProjectPage;
