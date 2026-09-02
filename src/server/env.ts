import "server-only";
import { z } from "zod";

const envSchema = z
  .object({
    DB_FILE_NAME: z.string().min(1).default("./data/pa9es.db"),
    BETTER_AUTH_SECRET: z
      .string()
      .min(32, "at least 32 chars; generate with `openssl rand -base64 32`"),
    BETTER_AUTH_URL: z.url(),
    // Host (with port in dev) that user subdomains hang off of:
    // <username>.ROOT_DOMAIN. "pa9es.com" in production.
    ROOT_DOMAIN: z.string().min(1).default("localhost:3000"),
    // AI features are core (docs/ai-features.md): a missing key fails
    // startup rather than silently hiding features.
    ANTHROPIC_API_KEY: z.string().min(1, "required — AI features are core"),
    // Transactional email (Resend). Optional so dev works without an account
    RESEND_API_KEY: z.preprocess(
      (value) => (value === "" ? undefined : value),
      z.string().optional(),
    ),
    EMAIL_FROM: z.preprocess(
      (value) => (value === "" ? undefined : value),
      z.string().default("pa9es <no-reply@pa9es.com>"),
    ),
  })
  .superRefine((value, ctx) => {
    // The canonical app origin must live on the root domain (apex or www),
    // otherwise auth cookies and the serving proxy disagree about hosts.
    const host = new URL(value.BETTER_AUTH_URL).host;
    if (host !== value.ROOT_DOMAIN && host !== `www.${value.ROOT_DOMAIN}`) {
      ctx.addIssue({
        code: "custom",
        path: ["BETTER_AUTH_URL"],
        message: `host "${host}" must be ROOT_DOMAIN ("${value.ROOT_DOMAIN}") or its www subdomain`,
      });
    }
  });

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  const issues = parsed.error.issues
    .map((issue) => `  - ${issue.path.join(".")}: ${issue.message}`)
    .join("\n");
  throw new Error(`Invalid environment configuration:\n${issues}`);
}

const env = parsed.data;

export const database = {
  file: env.DB_FILE_NAME,
};

// Named authConfig (not `auth`) to avoid clashing with the Better Auth
// instance exported from src/server/auth.ts.
export const authConfig = {
  secret: env.BETTER_AUTH_SECRET,
  url: env.BETTER_AUTH_URL,
};

export const app = {
  rootDomain: env.ROOT_DOMAIN,
};

export const emailConfig = {
  apiKey: env.RESEND_API_KEY,
  from: env.EMAIL_FROM,
};

export const aiConfig = {
  apiKey: env.ANTHROPIC_API_KEY,
};
