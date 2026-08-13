import { getPublishedIcon, getPublishedPage } from "@/src/server/actions/projects";
import { hostLabelSchema } from "@/src/schemas/shared";
import { NotFoundError } from "@/src/server/errors";
import {
  iconPage,
  notFoundPage,
  publishedPage,
  withIconLink,
} from "@/src/server/serve-page";

type RouteContext = { params: Promise<{ username: string; path: string[] }> };

// Serves <username>.ROOT_DOMAIN/<slug>, plus the page's emoji favicon at
// <slug>/icon.svg. Only reachable through the proxy rewrite — direct
// /sites/* requests on app hosts are blocked there. Slugs are hostname
// labels (no dots), so icon.svg can never collide with a page. Any other
// deeper path is a 404: pages are single-segment by design.
const GET = async (_request: Request, { params }: RouteContext) => {
  const { username: rawUsername, path } = await params;
  const isIconRequest = path.length === 2 && path[1] === "icon.svg";
  if (path.length !== 1 && !isIconRequest) {
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
    if (isIconRequest) {
      const { emoji } = await getPublishedIcon({ username, slug });
      return iconPage(emoji);
    }
    const { html, iconEmoji } = await getPublishedPage({ username, slug });
    return publishedPage(
      iconEmoji ? withIconLink(html, { slug, emoji: iconEmoji }) : html,
    );
  } catch (error) {
    if (error instanceof NotFoundError) {
      return notFoundPage();
    }
    throw error;
  }
};

export { GET };
