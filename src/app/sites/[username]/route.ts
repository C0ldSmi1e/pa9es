import { listPublishedPages } from "@/src/server/actions/projects";
import { hostLabelSchema } from "@/src/schemas/shared";
import { app, authConfig } from "@/src/server/env";
import { indexPage, notFoundPage } from "@/src/server/serve-page";

type RouteContext = { params: Promise<{ username: string }> };

// Subdomain root (<username>.ROOT_DOMAIN/): an index of the user's published
// pages. Unknown usernames and users with nothing published get the same 404,
// so the root reveals no more than the pages themselves do.
const GET = async (_request: Request, { params }: RouteContext) => {
  const { username: rawUsername } = await params;
  const username = rawUsername.toLowerCase();
  if (!hostLabelSchema.safeParse(username).success) {
    return notFoundPage();
  }

  const pages = await listPublishedPages({ username });
  if (pages.length === 0) {
    return notFoundPage();
  }

  return indexPage({
    username,
    rootDomain: app.rootDomain,
    homeUrl: authConfig.url,
    pages,
  });
};

export { GET };
