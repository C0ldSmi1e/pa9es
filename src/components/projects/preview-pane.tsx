"use client";

// srcdoc documents resolve URLs against the parent page, so a plain
// `<a href="#section">` would navigate the iframe to the app instead of
// scrolling. This shim (appended to the preview only — never stored or
// served) makes fragment links scroll in-page and blocks other navigation:
// the preview always shows this page.
const PREVIEW_SHIM = `<script>
document.addEventListener("click", (event) => {
  const anchor = event.target && event.target.closest ? event.target.closest("a[href]") : null;
  if (!anchor) return;
  const href = anchor.getAttribute("href");
  event.preventDefault();
  if (href && href.startsWith("#")) {
    const id = decodeURIComponent(href.slice(1));
    const el = id
      ? document.getElementById(id) || document.getElementsByName(id)[0]
      : null;
    if (el) el.scrollIntoView({ behavior: "smooth" });
    else if (!id) window.scrollTo({ top: 0, behavior: "smooth" });
  }
});
</${"script"}>`;

// allow-scripts WITHOUT allow-same-origin: user JS runs in an opaque origin —
// it can't read app cookies or reach the parent DOM.
const PreviewPane = ({ html, label }: { html: string; label: string }) => {
  return (
    <div className="flex min-w-0 flex-1 flex-col bg-white">
      <div className="border-b border-edge bg-panel px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.1em] text-dim">
        {label}
      </div>
      <iframe
        sandbox="allow-scripts"
        srcDoc={html + PREVIEW_SHIM}
        title="Preview"
        className="min-h-0 w-full flex-1 border-0 bg-white"
      />
    </div>
  );
};

export { PreviewPane };
