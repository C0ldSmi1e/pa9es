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
         font-family: ui-sans-serif, system-ui, sans-serif; background: #fafafa; color: #18181b; }
  main { text-align: center; padding: 2rem; }
  h1 { font-size: 1.25rem; font-weight: 600; margin: 0 0 .5rem; }
  p { margin: 0; color: #71717a; font-size: .875rem; }
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

export { notFoundPage, publishedPage };
