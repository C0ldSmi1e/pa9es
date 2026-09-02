# AI features

Two directions, one theme: pa9es is where AI-made pages go live.

1. **AI infra for AI agents** — agents (Claude Code, ChatGPT, any MCP client)
   can publish pages here programmatically. pa9es becomes the default deploy
   target for "my AI just wrote me an HTML page".
2. **AI functionalities** — AI inside the editor, working on the draft.

Both run on the systems that already exist: AI only ever writes the draft
(never `publishedHtml` — going live stays commit → make live), and the commit
timeline doubles as the undo history for anything AI does. AI usage is free
for now; the `ai_usage` ledger kind stays reserved, so turning on pricing
later is just a new entry writer, not a schema change.

---

## AI infra for AI agents

pa9es for agents, not just people. Three layers, each built on the last:

### API

A token-authed REST API over the full owner surface — whatever a person can
do in the app, an agent can do with a key:

- **Pages** — create a page, update the draft, commit, make live / unpublish
  (publish = deploy), restore, delete, list pages, read one.
- **Credits** — check the balance and ledger, so an agent can tell whether a
  publish will clear before trying (insufficient balance is still a 402).

Mostly not new endpoints: these are the app's existing `/api` routes, taught
to accept an API key (`Authorization: Bearer`) alongside a session cookie.
The typical agent flow is create → update draft → commit → make live, but
each step stands alone — an agent can iterate on a draft across many calls
before committing, exactly like the editor does. Every commit and publish
lands in the normal timeline, so the owner sees (and can roll back) what
their agent did.

- API keys: per-user, created/revoked in `/app/settings`. New table; keys are
  hashed at rest, shown once at creation.
- Publishing through the API costs the same publish credits as the UI:
  first go-live of a page charges, republishing is free by the existing
  idempotency. No new pricing — agents are users.

### MCP

A small MCP server wrapping that API, so any MCP client gets pa9es as tools.
Granular tools mirror the API (create, update draft, commit, make live,
list, credits), plus one convenience that keeps the thirty-second pitch:
`deploy_page` (html + slug → live URL) runs the whole
create-if-new → draft → commit → make-live flow in a single tool call.

### Docs for AI

Docs written to be read by a model, not just a person: `llms.txt` at the root,
plus a single compact API reference page designed to be pasted into a context
window ("give this file to your agent and it knows how to publish here").
Cheap to maintain — it is one page, generated from the same facts as the
human docs.

---

## AI functionalities

In-editor features. All follow the same rules:

- Input is the current draft; output replaces the draft.
- Before AI overwrites a dirty draft, auto-commit — restore is the undo.
- Free for now: no credit charge on AI actions — per-user rate limits are
  the only usage guard until pricing turns on.

### AI commit message

The small one, built first to prove the plumbing. Diff the draft against the
latest commit, suggest a message; one click fills the commit box.

### Ask AI for changes/updates

A prompt box in the editor: "make the header sticky", "add a contact form",
"translate to spanish" → the model rewrites the draft, streamed into Monaco
so you watch the edit happen. On an empty draft this is page generation:
"a landing page for my coffee shop" → a full page. This is the flagship.

### Propose different styles/designs

From the current draft, generate a few restyled variants — same content,
different fonts/colors/layout. Each variant previews in the sandboxed iframe
like a commit does; picking one overwrites the draft (auto-commit first).
Good for the "I have the words but it looks like 1998" user.

---

## How it runs

- `src/server/ai/` — server-only module on the AI SDK (`ai` +
  `@ai-sdk/anthropic`). Routes stay thin like everything else:
  `POST /api/projects/[projectId]/ai/<action>`.
- `ANTHROPIC_API_KEY` required in `env.ts`, like `BETTER_AUTH_SECRET`: AI is
  a core feature, so the app refuses to start without a key (the provider
  reads the var by default). No hidden-feature fallback.
- Model: `claude-opus-5` by default; per-feature overrides (e.g. a small
  model for commit messages) are config, not code.
- The AI SDK carries the streaming: `streamText` in the route,
  `@ai-sdk/react` hooks streaming into Monaco. One-shot actions (commit
  message, variants) use `generateText`/`generateObject` and return the
  standard envelope.
- Rate limiting via the existing `RateLimitError` → 429 path, per user per
  action.

## Order of build

1. AI commit message — smallest slice through the whole stack (env, ai
   module, rate limit, one route, one button).
2. Ask AI for changes — the flagship; generation falls out of it.
3. Styles/designs — same endpoint shape, multi-variant UI.
4. Agent infra — API keys, then MCP, then llms.txt.
