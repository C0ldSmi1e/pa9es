import { notFound, redirect } from "next/navigation";
import { getProject } from "@/src/actions/projects";
import { Editor } from "@/src/app/app/projects/[projectId]/editor";
import { app, authConfig } from "@/src/config/settings";
import { NotFoundError } from "@/src/utils/errors";
import { getSession } from "@/src/utils/session";

type PageProps = { params: Promise<{ projectId: string }> };

const ProjectPage = async ({ params }: PageProps) => {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }

  const { projectId } = await params;
  let project;
  try {
    project = await getProject({ userId: session.user.id, projectId });
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

  return <Editor initial={project} liveUrl={liveUrl} />;
};

export default ProjectPage;
