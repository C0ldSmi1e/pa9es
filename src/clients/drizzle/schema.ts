import { sql } from "drizzle-orm";
import {
  index,
  integer,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";

// Epoch-ms default evaluated by SQLite itself, so rows created outside the
// ORM (raw SQL, future tooling) get correct timestamps too. Matches what
// `@better-auth/cli generate` emits.
const nowMs = sql`(cast(unixepoch('subsecond') * 1000 as integer))`;

// ─── Better Auth tables ──────────────────────────────────────────────────────
//
// Mirrors the output of `bunx @better-auth/cli generate --config
// src/config/auth.ts` for an email/password setup with the username and admin
// plugins (verified against better-auth 1.6.26). The property keys are the
// field names Better Auth reads through its drizzle adapter — those must not
// change. Better Auth supplies ids and timestamps for its own tables at
// runtime; the DB defaults are a fallback for manual inserts.
//
// One deliberate deviation: role gets a DB default of "user" (the CLI leaves
// it defaultless) so rows created outside Better Auth still get a sane role.

const user = sqliteTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: integer("email_verified", { mode: "boolean" })
    .default(false)
    .notNull(),
  image: text("image"),
  // username plugin. The username doubles as the user's subdomain
  // (<username>.pa9es.com), so signup validates it against hostname rules and
  // the reserved-name list, and lowercases it, before it ever reaches the DB.
  // Nullable because the plugin permits accounts without one; our signup flow
  // always requires it.
  username: text("username").unique(),
  displayUsername: text("display_username"),
  // admin plugin. Nullable to accept whatever the plugin writes (e.g. unban
  // clears ban fields); a null role means a regular user.
  role: text("role").default("user"),
  banned: integer("banned", { mode: "boolean" }).default(false),
  banReason: text("ban_reason"),
  banExpires: integer("ban_expires", { mode: "timestamp_ms" }),
  createdAt: integer("created_at", { mode: "timestamp_ms" })
    .default(nowMs)
    .notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" })
    .default(nowMs)
    .$onUpdate(() => new Date())
    .notNull(),
});

const session = sqliteTable(
  "session",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    token: text("token").notNull().unique(),
    expiresAt: integer("expires_at", { mode: "timestamp_ms" }).notNull(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    // admin plugin: id of the admin currently impersonating this session's
    // user. Deliberately not a FK — deleting the impersonating admin must not
    // delete or block on someone else's session.
    impersonatedBy: text("impersonated_by"),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .default(nowMs)
      .notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [index("session_userId_idx").on(table.userId)],
);

const account = sqliteTable(
  "account",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    // For email/password accounts providerId is "credential" and accountId
    // mirrors the user id. The OAuth token fields stay null in MVP but are
    // part of the model Better Auth expects to exist.
    providerId: text("provider_id").notNull(),
    accountId: text("account_id").notNull(),
    password: text("password"),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: integer("access_token_expires_at", {
      mode: "timestamp_ms",
    }),
    refreshTokenExpiresAt: integer("refresh_token_expires_at", {
      mode: "timestamp_ms",
    }),
    scope: text("scope"),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .default(nowMs)
      .notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [index("account_userId_idx").on(table.userId)],
);

// Short-lived tokens for email verification / password reset flows.
const verification = sqliteTable(
  "verification",
  {
    id: text("id").primaryKey(),
    identifier: text("identifier").notNull(),
    value: text("value").notNull(),
    expiresAt: integer("expires_at", { mode: "timestamp_ms" }).notNull(),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .default(nowMs)
      .notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .default(nowMs)
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [index("verification_identifier_idx").on(table.identifier)],
);

// ─── Domain tables ───────────────────────────────────────────────────────────

// One project = one hosted HTML page, live at <username>.pa9es.com/<slug>
// while published. The subdomain root ("/") never resolves to a project.
const project = sqliteTable(
  "project",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    // URL path segment; same charset and length rules as usernames, enforced
    // at the app layer.
    slug: text("slug").notNull(),
    // Dashboard display name; creation defaults it to the slug.
    title: text("title").notNull(),
    // The editor only ever writes draftHtml; visitors are only ever served
    // publishedHtml. Publishing copies draft → published, so in-progress
    // edits never leak to the live page. Also the seam where per-publish
    // version snapshots and publish-consumes-credits slot in later.
    draftHtml: text("draft_html").notNull().default(""),
    publishedHtml: text("published_html"),
    // Kept separate from `publishedHtml IS NOT NULL` so unpublish →
    // republish restores the exact previous snapshot without re-editing.
    isPublished: integer("is_published", { mode: "boolean" })
      .notNull()
      .default(false),
    publishedAt: integer("published_at", { mode: "timestamp_ms" }),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .default(nowMs)
      .notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .default(nowMs)
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    // Slugs are unique per user (alice/blog and bob/blog coexist). The
    // user_id prefix doubles as the index for the dashboard's project list,
    // and the serving path resolves pages by exactly this pair. Slug races
    // surface as unique violations → ConflictError via isUniqueViolation.
    uniqueIndex("project_user_id_slug_idx").on(table.userId, table.slug),
  ],
);

// NOTE: the CLI also emits a `relations()` block, but drizzle-orm v1 replaced
// that API with `defineRelations`. FKs above carry the real constraints; add
// a defineRelations file if/when the db.query relational API is needed.

type User = typeof user.$inferSelect;
type Project = typeof project.$inferSelect;

export { user, session, account, verification, project };
export type { User, Project };
