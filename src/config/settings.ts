import { z } from "zod";

const envSchema = z.object({
  DB_FILE_NAME: z.string().min(1).default("./data/pa9es.db"),
  BETTER_AUTH_SECRET: z
    .string()
    .min(32, "at least 32 chars; generate with `openssl rand -base64 32`"),
  BETTER_AUTH_URL: z.url(),
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
// instance exported from src/config/auth.ts.
export const authConfig = {
  secret: env.BETTER_AUTH_SECRET,
  url: env.BETTER_AUTH_URL,
};

export const pagination = {
  defaultLimit: 10,
  defaultOffset: 0,
  maxLimit: 1000,
};

export const content = {
  // Cap on one page's HTML, measured in UTF-8 bytes (what SQLite stores).
  maxHtmlBytes: 1024 * 1024,
};
