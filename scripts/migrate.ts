// Applies the SQL migrations in drizzle/ to the SQLite file, then exits.
// Used by the docker-compose `migrate` service (drizzle-kit's CLI cannot run
// under Bun — its sqlite driver wants node:sqlite — so production migrates
// through drizzle-orm's bun-sqlite migrator instead; dev keeps using
// `bun run db:migrate`, which executes drizzle-kit under Node).
//
// Deliberately self-contained: importing src/server/db would pull in
// "server-only" and the full env validation (BETTER_AUTH_*), neither of which
// a migration needs. Like drizzle.config.ts, it reads DB_FILE_NAME directly.
import { Database } from "bun:sqlite";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { drizzle } from "drizzle-orm/bun-sqlite";
import { migrate } from "drizzle-orm/bun-sqlite/migrator";

const file = process.env.DB_FILE_NAME ?? "./data/pa9es.db";
mkdirSync(dirname(file), { recursive: true });

const client = new Database(file);
client.run("PRAGMA busy_timeout = 5000");
client.run("PRAGMA journal_mode = WAL");
const db = drizzle({ client });

migrate(db, { migrationsFolder: "./drizzle" });
client.close();
console.log(`migrate: applied drizzle/ migrations to ${file}`);
