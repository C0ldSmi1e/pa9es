import "server-only";
import { Resend } from "resend";
import { emailConfig } from "@/src/server/env";

// Constructed lazily so this module loads fine without an API key (the dev
// fallback below never touches the client).
let client: Resend | null = null;
const getClient = (): Resend => {
  client ??= new Resend(emailConfig.apiKey);
  return client;
};

const sendEmail = async ({
  to,
  subject,
  html,
}: {
  to: string;
  subject: string;
  html: string;
}): Promise<void> => {
  if (!emailConfig.apiKey) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("RESEND_API_KEY is not set — refusing to drop email");
    }
    // Hrefs are entity-escaped in templates; undo that so the logged URL is
    // directly clickable/pasteable.
    const links = [...html.matchAll(/href="([^"]+)"/g)].map((match) =>
      match[1].replaceAll("&amp;", "&"),
    );
    console.log(
      [`[email dev-fallback] to=${to} subject="${subject}"`, ...links].join("\n  "),
    );
    return;
  }

  const { error } = await getClient().emails.send({
    from: emailConfig.from,
    to,
    subject,
    html,
  });
  if (error) {
    throw new Error(`Failed to send "${subject}" to ${to}: ${error.message}`);
  }
};

export { sendEmail };
