import { z } from "zod";

const envSchema = z.object({
  DB_FILE_NAME: z.string().min(1).default("./data/pa9es.db"),
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

export const pagination = {
  defaultLimit: 10,
  defaultOffset: 0,
  maxLimit: 1000,
};
