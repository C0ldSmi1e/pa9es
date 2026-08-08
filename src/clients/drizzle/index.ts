import { mkdirSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname } from "node:path";
import { database } from "@/src/config/settings";

const createDb = () => {
  if (!process.versions.bun) {
    throw new Error(
      "The database layer uses bun:sqlite and requires the Bun runtime. " +
        "Run app code with `bun --bun …` (see package.json scripts).",
    );
  }

  mkdirSync(dirname(database.file), { recursive: true });

  const requireRuntime = createRequire(import.meta.url);
  const sqliteId = "bun:sqlite";
  const driverId = "drizzle-orm/bun-sqlite";
  const { Database } = requireRuntime(sqliteId);
  const { drizzle } = requireRuntime(
    driverId,
  ) as typeof import("drizzle-orm/bun-sqlite");

  const client = new Database(database.file);
  client.run("PRAGMA journal_mode = WAL");
  client.run("PRAGMA foreign_keys = ON");
  client.run("PRAGMA busy_timeout = 5000");
  client.run("PRAGMA synchronous = NORMAL");
  return drizzle({ client });
};

type Db = ReturnType<typeof createDb>;

const globalForDb = globalThis as unknown as { db?: Db };

const db = globalForDb.db ?? createDb();

if (process.env.NODE_ENV !== "production") {
  globalForDb.db = db;
}

export { db };
