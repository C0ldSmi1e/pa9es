type EmailTemplate = { subject: string; html: string };

const escapeHtml = (value: string): string =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");

// Shared shell for all templates.
const layout = (content: string): string => `<!doctype html>
<html lang="en">
<body style="margin:0;padding:24px;background:#fafafa;font-family:ui-sans-serif,system-ui,-apple-system,sans-serif;color:#18181b;">
  <div style="max-width:480px;margin:0 auto;background:#ffffff;border:1px solid #e4e4e7;border-radius:12px;padding:32px;">
    <div style="font-size:16px;font-weight:600;margin-bottom:24px;">pa9es</div>
${content}
  </div>
  <div style="max-width:480px;margin:16px auto 0;text-align:center;font-size:12px;color:#a1a1aa;">
    Host a single HTML page — live in thirty seconds.
  </div>
</body>
</html>
`;

const verificationEmail = ({
  name,
  url,
}: {
  name: string;
  url: string;
}): EmailTemplate => ({
  subject: "Verify your pa9es account",
  html: layout(`    <p style="margin:0 0 16px;font-size:14px;">Hi ${escapeHtml(name)},</p>
    <p style="margin:0 0 24px;font-size:14px;color:#3f3f46;">
      Confirm your email address to activate your account and start publishing pages.
    </p>
    <a href="${escapeHtml(url)}"
       style="display:inline-block;background:#18181b;color:#ffffff;text-decoration:none;font-size:14px;font-weight:500;padding:10px 20px;border-radius:8px;">
      Verify email
    </a>
    <p style="margin:24px 0 0;font-size:12px;color:#71717a;">
      This link expires in one hour. If the button doesn't work, paste this URL into your browser:<br>
      <span style="word-break:break-all;color:#3f3f46;">${escapeHtml(url)}</span>
    </p>
    <p style="margin:16px 0 0;font-size:12px;color:#71717a;">
      If you didn't create a pa9es account, you can ignore this email.
    </p>`),
});

export { verificationEmail };
export type { EmailTemplate };
