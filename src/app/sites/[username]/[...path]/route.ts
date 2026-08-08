import { getPublishedPage } from "@/src/actions/projects";
import { hostLabelSchema } from "@/src/schemas/shared";
import { NotFoundError } from "@/src/utils/errors";
import { notFoundPage, publishedPage } from "@/src/utils/serve-page";

type RouteContext = { params: Promise<{ username: string; path: string[] }> };

// Serves <username>.ROOT_DOMAIN/<slug>. Only reachable through the proxy
// rewrite — direct /sites/* requests on app hosts are blocked there. Any
// deeper path than a single slug is a 404: pages are single-segment by
// design.
const GET = async (_request: Request, { params }: RouteContext) => {
  const { username: rawUsername, path } = await params;
  if (path.length !== 1) {
    return notFoundPage();
  }

  const username = rawUsername.toLowerCase();
  const slug = path[0].toLowerCase();
  if (
    !hostLabelSchema.safeParse(username).success ||
    !hostLabelSchema.safeParse(slug).success
  ) {
    return notFoundPage();
  }

  try {
    const { html } = await getPublishedPage({ username, slug });
    return publishedPage(html);
  } catch (error) {
    if (error instanceof NotFoundError) {
      return notFoundPage();
    }
    throw error;
  }
};

export { GET };
