// Minimal branded 404 for user subdomains. Deliberately plain HTML — user
// subdomains never render the app (and never see its cookies).
const NOT_FOUND_HTML = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Nothing here · pa9es</title>
<style>
  body { margin: 0; display: grid; place-items: center; min-height: 100vh;
         font-family: ui-sans-serif, system-ui, sans-serif; background: #f2f2ef; color: #1a1a1c; }
  main { text-align: center; padding: 2rem; }
  h1 { font-size: 1.25rem; font-weight: 600; margin: 0 0 .5rem; }
  p { margin: 0; color: #6d6d72; font-size: .875rem; }
</style>
</head>
<body>
<main>
  <h1>Nothing here (yet)</h1>
  <p>There is no published page at this address.</p>
</main>
</body>
</html>
`;

const notFoundPage = (): Response =>
  new Response(NOT_FOUND_HTML, {
    status: 404,
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });

const publishedPage = (html: string): Response =>
  new Response(html, {
    status: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      // Publish/unpublish must take effect immediately; caching is a later
      // optimization.
      "Cache-Control": "no-cache",
      "X-Content-Type-Options": "nosniff",
    },
  });

// Emoji site icon as an SVG favicon, rendered by the viewer's platform
// emoji font. Only curated-set emoji reach here (membership validated at
// the API layer), so the interpolation cannot produce markup.
const iconPage = (emoji: string): Response =>
  new Response(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text y=".9em" font-size="90">${emoji}</text></svg>`,
    {
      status: 200,
      headers: {
        "Content-Type": "image/svg+xml; charset=utf-8",
        // The injected href carries ?v=<emoji>, so the URL changes whenever
        // the icon does — safe to cache hard.
        "Cache-Control": "public, max-age=31536000, immutable",
        "X-Content-Type-Options": "nosniff",
      },
    },
  );

// Any icon-ish rel value (icon, shortcut icon, apple-touch-icon) counts as
// the author declaring their own favicon.
const ICON_LINK_REGEX = /<link\b[^>]*\brel\s*=\s*["']?[^"'>]*\bicon\b/i;

// Injects a favicon link into published HTML when the page declares none —
// the author's own markup always wins. Inserted after <head> (falling back
// to <html>, then the doctype) so nothing ever precedes <!doctype>, which
// would knock the page into quirks mode.
const withIconLink = (
  html: string,
  { slug, emoji }: { slug: string; emoji: string },
): string => {
  if (ICON_LINK_REGEX.test(html)) {
    return html;
  }
  const tag = `<link rel="icon" type="image/svg+xml" href="/${slug}/icon.svg?v=${encodeURIComponent(emoji)}">`;
  for (const opener of [/<head\b[^>]*>/i, /<html\b[^>]*>/i, /<!doctype\b[^>]*>/i]) {
    const match = opener.exec(html);
    if (match) {
      const at = match.index + match[0].length;
      return html.slice(0, at) + tag + html.slice(at);
    }
  }
  return tag + html;
};

// Titles are free-form user text; usernames/slugs are validated hostname
// labels but get escaped anyway.
const escapeHtml = (value: string): string =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");

// Subdomain root index: every published page a user has. Plain HTML like the
// 404 above — no app shell, no cookies on user subdomains.
const indexPage = ({
  username,
  rootDomain,
  homeUrl,
  pages,
}: {
  username: string;
  rootDomain: string;
  homeUrl: string;
  pages: Array<{ slug: string; title: string; iconEmoji: string | null }>;
}): Response => {
  const rows = pages
    .map(({ slug, title, iconEmoji }) => {
      // Same rule as the dashboard list: icon only when set, no reserved slot.
      const icon = iconEmoji
        ? `<span class="icon">${escapeHtml(iconEmoji)}</span>`
        : "";
      return `<li><a href="/${escapeHtml(slug)}"><span class="title">${icon}${escapeHtml(
        title,
      )}</span></a></li>`;
    })
    .join("\n");

  const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(username)} · pa9es</title>
<style>
  body { margin: 0; min-height: 100vh; background: #f2f2ef; color: #1a1a1c;
         font-family: ui-sans-serif, system-ui, sans-serif; -webkit-font-smoothing: antialiased; }
  main { max-width: 36rem; margin: 0 auto; padding: 4rem 1.5rem 5rem; }
  h1 { font-family: ui-monospace, 'SF Mono', Menlo, Consolas, monospace;
       font-size: 1.35rem; font-weight: 600; letter-spacing: -.01em; margin: 0; }
  h1 .domain { color: #b9b9b2; font-weight: 400; }
  .count { margin: .4rem 0 1.8rem; font-family: ui-monospace, monospace;
           font-size: .78rem; color: #6d6d72; }
  ul { list-style: none; margin: 0; padding: 0; border-top: 1px solid #e2e2db; }
  li { border-bottom: 1px solid #e2e2db; }
  li a { display: block; padding: .9rem .35rem; text-decoration: none; color: #1a1a1c;
         transition: background .12s ease; }
  li a:hover { background: #ffffff; }
  .title { font-size: .95rem; font-weight: 550; }
  .icon { margin-right: .5rem; }
  footer { margin-top: 2.5rem; font-size: .8rem; color: #6d6d72; }
  footer a { color: #6d6d72; text-decoration: underline; text-underline-offset: 3px; }
  footer a:hover { color: #1a1a1c; }
  footer b { color: #9a7418; font-weight: 600; }
</style>
</head>
<body>
<main>
  <h1>${escapeHtml(username)}<span class="domain">.${escapeHtml(rootDomain)}</span></h1>
  <p class="count">${pages.length} page${pages.length === 1 ? "" : "s"}</p>
  <ul>
${rows}
  </ul>
  <footer>hosted on <a href="${escapeHtml(homeUrl)}">pa<b>9</b>es</a></footer>
</main>
</body>
</html>
`;

  return new Response(html, {
    status: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      // Publishing or unpublishing a page must show up here immediately.
      "Cache-Control": "no-cache",
      "X-Content-Type-Options": "nosniff",
    },
  });
};

export { notFoundPage, publishedPage, indexPage, iconPage, withIconLink };
