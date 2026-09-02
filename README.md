# pa9es

Host a single HTML page. Sign up, write or paste your HTML, name it, and it's live at `yourname.pa9es.com/pagename`. One file per page, no build step, no git repo. Publishing costs credits.

Design details live in [`docs/system-overview.md`](docs/system-overview.md).

## Tech stack

- [Next.js](https://nextjs.org) (App Router) on [Bun](https://bun.sh)
- SQLite (`bun:sqlite`) with [Drizzle ORM](https://orm.drizzle.team)
- [Better Auth](https://better-auth.com) for email/password auth
- [Resend](https://resend.com) for transactional email
- [Monaco](https://microsoft.github.io/monaco-editor/) editor, Tailwind CSS v4, Zod

## Setup

Requires [Bun](https://bun.sh) ≥ 1.3.

```bash
bun install

cat > .env <<EOF
BETTER_AUTH_SECRET=$(openssl rand -base64 32)
BETTER_AUTH_URL=http://localhost:3000
ANTHROPIC_API_KEY=<your Anthropic API key>
EOF

bun run db:migrate
bun run dev
```

Open http://localhost:3000. `ANTHROPIC_API_KEY` needs a real [Anthropic API key](https://console.anthropic.com/) — AI features are core, so the app refuses to start without one. Without `RESEND_API_KEY`, verification emails are logged to the server console. Full env schema: `src/server/env.ts`.

## Contributing

- Use Bun for everything (`bun install`, `bun run ...`, `bunx`) — see [`AGENTS.md`](AGENTS.md)
- `src/server/` is server-only; `src/lib/` is browser-safe; `src/schemas/` and `src/config/` are shared and must not read `process.env`
- Absolute imports: `@/src/...`
- API endpoints return the standard envelope from `src/server/create-response.ts`
- Schema changes: `bun run db:generate`, then `bun run db:migrate`
- Lint before pushing: `bun run lint`
