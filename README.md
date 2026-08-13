# pa9es

Host a single HTML page. Sign up, write or paste your HTML, name it, and it's live at `yourname.pa9es.com/pagename`.

pa9es is for people who have one HTML file and want it online in thirty seconds — landing pages, demos, AI-generated pages, experiments. It is deliberately **not** a static site host: one file per page, no build step, no git repo. Publishing costs credits (no card, no subscription).

## How it works

| URL | What |
|---|---|
| `www.pa9es.com` | Marketing site |
| `www.pa9es.com/app` | User dashboard + editor |
| `www.pa9es.com/admin` | Admin dashboard |
| `alice.pa9es.com/blog` | A user's published page |
| `alice.pa9es.com` | Index of alice's published pages |

Usernames are hostnames (lowercase letters, numbers, hyphens, max 63 chars), validated at signup with a reserved/lookalike blocklist. A proxy (`src/proxy.ts`) does host-based routing: the root domain (and its `www`) serves the app, while every other subdomain is rewritten to internal `/sites/<username>/...` routes that serve only published HTML.

### Version model

- The editor's draft is an autosaved worktree; it is never served to visitors.
- A **commit** snapshots the draft (message required; versions v1, v2, …). Commits are immutable.
- **Production is a pointer to one commit** ("Make live" / "Unpublish" in the timeline). Rollback = make an older commit live.
- Restoring a commit overwrites the draft; the UI confirms first if uncommitted changes would be lost.

### Credits

Bookkeeping is an append-only ledger — one signed entry per balance change, with a denormalized balance updated in the same transaction. Entries are idempotent per `(kind, refId)`, so replayed grants and charges are silent no-ops. Current policy (tunable in `src/config/constants.ts`): signup grants a bonus; the first-ever go-live of a project charges a publish fee, keyed on the project id, so republish and rollback are free. Insufficient balance → HTTP 402.

## Tech stack

- [Next.js](https://nextjs.org) (App Router) on the [Bun](https://bun.sh) runtime — the database layer uses `bun:sqlite`, so app code must run with `bun --bun` (the package scripts already do)
- SQLite via [Drizzle ORM](https://orm.drizzle.team) (WAL mode, single file at `DB_FILE_NAME`)
- [Better Auth](https://better-auth.com) — email + password with mandatory email verification
- [Resend](https://resend.com) for transactional email (optional in dev: without an API key, emails are logged to the console)
- [Monaco](https://microsoft.github.io/monaco-editor/) editor (with vim mode) for the HTML editor
- Tailwind CSS v4, Zod v4

## Getting started

Prereq: [Bun](https://bun.sh) ≥ 1.3.

```bash
bun install

# Environment — see src/server/env.ts for the full schema
cat > .env <<EOF
BETTER_AUTH_SECRET=$(openssl rand -base64 32)
BETTER_AUTH_URL=http://localhost:3000
EOF

# Create the SQLite database
bun run db:migrate

bun run dev
```

Open [http://localhost:3000](http://localhost:3000). Defaults make dev work out of the box: `ROOT_DOMAIN` falls back to `localhost:3000` (user pages resolve at `<username>.localhost:3000`), the database file to `./data/pa9es.db`, and verification/reset emails are printed to the server console when `RESEND_API_KEY` is unset.

### Environment variables

| Variable | Required | Notes |
|---|---|---|
| `BETTER_AUTH_SECRET` | yes | ≥ 32 chars; `openssl rand -base64 32` |
| `BETTER_AUTH_URL` | yes | Canonical app origin; its host must be `ROOT_DOMAIN` or `www.ROOT_DOMAIN` |
| `ROOT_DOMAIN` | no | Host that user subdomains hang off of (default `localhost:3000`, `pa9es.com` in production) |
| `DB_FILE_NAME` | no | SQLite file path (default `./data/pa9es.db`) |
| `RESEND_API_KEY` | no (prod: yes) | Without it, dev logs emails to the console; production refuses to send |
| `EMAIL_FROM` | no | Default `pa9es <no-reply@pa9es.com>` |

### Scripts

| Command | What |
|---|---|
| `bun run dev` | Dev server |
| `bun run build` / `bun run start` | Production build / serve |
| `bun run lint` | ESLint |
| `bun run db:generate` | Generate a migration from schema changes |
| `bun run db:migrate` | Apply migrations |
| `bun run db:studio` | Drizzle Studio |

## Code organization

```
src/
  app/         Routing shell only — pages, layouts, API routes
  components/  UI components
  server/      Server-only zone (imports "server-only"; client bundles that touch it fail the build)
    actions/   Server actions (projects, commits, credits, admin)
    db/        Drizzle client + schema
    emails/    Templates (pure { subject, html }) and delivery
  lib/         Browser-safe helpers
  schemas/     Zod schemas shared by both sides — never read process.env here
  config/      Client-safe constants (pricing, pagination caps, reserved usernames)
  proxy.ts     Host-based routing: app hosts pass through, user subdomains → /sites/*
```

Conventions: imports use absolute paths (`@/src/...`), and every API endpoint returns the standard response envelope built with `src/server/create-response.ts` (shape defined in `src/schemas/standard-response.ts`). `GET` collection endpoints return everything by default (hard-capped) and support `limit`/`offset` pagination.

## Deployment

`Dockerfile` builds a standalone Next.js image on `oven/bun:1-alpine`; the entrypoint runs pending Drizzle migrations before starting. `docker-compose.yml` runs it with `.env` and a named volume for the SQLite data, attached to an external tunnel network. `scripts/deploy.sh` is a simple poll-and-redeploy: it fetches `origin/main`, and if the deployed revision changed, rebuilds via `docker compose up -d --build`.

## Docs

The design doc — feature list, URL rules, version model, credits ledger, email flows — lives in [`docs/system-overview.md`](docs/system-overview.md). Guidelines for coding agents are in [`AGENTS.md`](AGENTS.md).
