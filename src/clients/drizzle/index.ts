import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { database } from "@/src/config/settings";

const globalForDb = globalThis as unknown as {
  sqlite?: Database.Database;
};

const createConnection = (): Database.Database => {
  mkdirSync(dirname(database.file), { recursive: true });

  const sqlite = new Database(database.file);

  sqlite.pragma("journal_mode = WAL");
  sqlite.pragma("foreign_keys = ON");
  sqlite.pragma("busy_timeout = 5000");
  sqlite.pragma("synchronous = NORMAL");

  return sqlite;
};

const sqlite = globalForDb.sqlite ?? createConnection();

if (process.env.NODE_ENV !== "production") {
  globalForDb.sqlite = sqlite;
}

const db = drizzle({ client: sqlite });

export { db, sqlite };
