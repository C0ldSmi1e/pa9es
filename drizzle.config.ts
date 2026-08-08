import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { defineConfig } from "drizzle-kit";

const url = process.env.DB_FILE_NAME ?? "./data/pa9es.db";

// drizzle-kit creates the db file but not its parent directory; without this
// a fresh clone (or a deleted ./data) fails with SQLITE_CANTOPEN (14).
mkdirSync(dirname(url), { recursive: true });

export default defineConfig({
  dialect: "sqlite",
  schema: "./src/clients/drizzle/schema.ts",
  out: "./drizzle",
  dbCredentials: { url },
});
