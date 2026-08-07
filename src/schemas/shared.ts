import { z } from "zod";

// One DNS label: lowercase alphanumerics and hyphens, 1–63 chars, no leading
// or trailing hyphen. Usernames must satisfy this because they become
// subdomains (<username>.pa9es.com); project slugs reuse the same rule so
// URLs stay uniform. ASCII-only, which also rules out unicode-homoglyph
// tricks (е vs e).
const HOST_LABEL_REGEX = /^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?$/;

const hostLabelSchema = z
  .string()
  .regex(
    HOST_LABEL_REGEX,
    "Only lowercase letters, numbers and hyphens (not at the edges), 63 chars max",
  );

export { HOST_LABEL_REGEX, hostLabelSchema };
