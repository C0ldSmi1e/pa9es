import { NextRequest, NextResponse } from "next/server";
import { app, authConfig } from "@/src/server/env";

// Canonical app origin = BETTER_AUTH_URL. Session cookies and Better Auth's
// Origin checks are bound to it, so app traffic on any other app-shaped host
// (e.g. the apex when canonical is www) is redirected instead of served as a
// broken second origin.
const canonicalUrl = new URL(authConfig.url);

// Host-based routing, and nothing else — no database access here (the proxy
// is a network boundary; see Next docs). App hosts (ROOT_DOMAIN and its www)
// pass through to the app; every other subdomain of ROOT_DOMAIN is a user's
// namespace and is rewritten to the internal /sites/<username>/... routes,
// which serve only published HTML. Unknown foreign hosts fall through to the
// app.

export const config = {
  matcher: ["/((?!_next/static|_next/image).*)"],
};

export function proxy(request: NextRequest) {
  const host = (request.headers.get("host") ?? "").toLowerCase();
  const { rootDomain } = app;
  const { pathname } = request.nextUrl;

  const isSubdomain =
    host !== rootDomain &&
    host !== `www.${rootDomain}` &&
    host.endsWith(`.${rootDomain}`);

  if (!isSubdomain) {
    if (host !== canonicalUrl.host.toLowerCase()) {
      const url = request.nextUrl.clone();
      url.protocol = canonicalUrl.protocol;
      url.host = canonicalUrl.host;
      // Setting host alone keeps any existing port (URL API quirk) — behind
      // the tunnel that leaks the container's :3000 into public redirects.
      url.port = canonicalUrl.port;
      return NextResponse.redirect(url, 307);
    }
    // The internal serving prefix is reachable only via the rewrite below.
    if (pathname === "/sites" || pathname.startsWith("/sites/")) {
      return NextResponse.rewrite(new URL("/__no-such-page", request.url));
    }
    return NextResponse.next();
  }

  // "alice" from alice.<rootDomain>. A multi-label host (a.b.<rootDomain>)
  // yields "a.b", which can never match a username, so it 404s in the route.
  const username = host.slice(0, host.length - rootDomain.length - 1);
  return NextResponse.rewrite(
    new URL(`/sites/${encodeURIComponent(username)}${pathname}`, request.url),
  );
}
