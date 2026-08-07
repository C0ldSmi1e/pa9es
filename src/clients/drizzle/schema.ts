import { integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

// ─── Better Auth tables ──────────────────────────────────────────────────────
//
// Hand-written to match what `bunx @better-auth/cli generate` emits for an
// email/password setup with the username and admin plugins. The property keys
// are the field names Better Auth reads through its drizzle adapter — those
// must not change. Column names (snake_case) are our own choice; drizzle maps
// them. Re-verify against the CLI output when Better Auth gets wired up.
//
// Better Auth generates ids and timestamps for its own tables at runtime; the
// $defaultFn fallbacks only matter for manual inserts (seeds, admin scripts).

const user = sqliteTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: integer("email_verified", { mode: "boolean" })
    .notNull()
    .default(false),
  image: text("image"),
  // username plugin. The username doubles as the user's subdomain
  // (<username>.pa9es.com), so signup validates it against hostname rules and
  // the reserved-name list, and lowercases it, before it ever reaches the DB.
  // Nullable because the plugin permits accounts without one; our signup flow
  // always requires it.
  username: text("username").unique(),
  displayUsername: text("display_username"),
  // admin plugin. Left nullable to accept whatever the plugin writes (e.g.
  // unban clears ban fields); role defaults to "user", admins are promoted.
  role: text("role").default("user"),
  banned: integer("banned", { mode: "boolean" }).default(false),
  banReason: text("ban_reason"),
  banExpires: integer("ban_expires", { mode: "timestamp_ms" }),
  createdAt: integer("created_at", { mode: "timestamp_ms" })
    .notNull()
    .$defaultFn(() => new Date()),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" })
    .notNull()
    .$defaultFn(() => new Date()),
});

const session = sqliteTable("session", {
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
    .notNull()
    .$defaultFn(() => new Date()),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" })
    .notNull()
    .$defaultFn(() => new Date()),
});

const account = sqliteTable("account", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  // For email/password accounts providerId is "credential" and accountId
  // mirrors the user id. The OAuth token fields stay null in MVP but are part
  // of the model Better Auth expects to exist.
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
    .notNull()
    .$defaultFn(() => new Date()),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" })
    .notNull()
    .$defaultFn(() => new Date()),
});

// Short-lived tokens for email verification / password reset flows.
const verification = sqliteTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: integer("expires_at", { mode: "timestamp_ms" }).notNull(),
  createdAt: integer("created_at", { mode: "timestamp_ms" })
    .notNull()
    .$defaultFn(() => new Date()),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" })
    .notNull()
    .$defaultFn(() => new Date()),
});

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
      .notNull()
      .$defaultFn(() => new Date()),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .notNull()
      .$defaultFn(() => new Date())
      .$onUpdateFn(() => new Date()),
  },
  (table) => [
    // Slugs are unique per user (alice/blog and bob/blog coexist). The
    // user_id prefix doubles as the index for the dashboard's project list,
    // and the serving path resolves pages by exactly this pair. Slug races
    // surface as unique violations → ConflictError via isUniqueViolation.
    uniqueIndex("project_user_id_slug_idx").on(table.userId, table.slug),
  ],
);

type User = typeof user.$inferSelect;
type Project = typeof project.$inferSelect;

export { user, session, account, verification, project };
export type { User, Project };
