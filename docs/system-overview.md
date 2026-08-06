# pa9es — Design Doc

*Design only. Nothing built yet.*

---

## What it is

Host a single HTML page. Sign up, upload or write your HTML, name it, and it's live at `yourname.pa9es.com/pagename`.

Pay with credits bought in USDC. No card, no subscription.

For people who have one HTML file and want it online in thirty seconds — landing pages, demos, AI-generated pages, experiments. Not a static site host: one file per page, no build step, no git repo.

Built to be used by AI agents as much as by people. See [API and agents](#api-and-agents).

**Why credits:** crypto can't do recurring charges. You can't bill a wallet monthly. Prepaid is the only model that fits.

---

## URLs

Everything on one domain for now.

| URL | What |
|---|---|
| `www.pa9es.com` | Marketing |
| `www.pa9es.com/app` | User dashboard + editor |
| `www.pa9es.com/superadmin` | Admin (me) |
| `alice.pa9es.com/blog` | A user's page |

**Username is the subdomain, page name is the path.** So only usernames are globally unique. Everyone can have a page called `blog`. Same as GitHub Pages.

DNS: `*.pa9es.com` → the server, plus an explicit `www` record. Cloudflare's free Universal SSL covers the wildcard at one level.

**Rules that fall out of this:**

- Usernames are hostnames: lowercase letters, numbers, hyphens, max 63 chars. Check at signup.
- Can't do `page.user.pa9es.com` — wildcards only match one label. Path it is.
- Reserve before launch: `www`, `app`, `api`, `admin`, `mail`, `cdn`, `static`, `status`, `docs`, `help`, `blog`, plus brand names like `paypal`, `metamask`, `coinbase`. Also block lookalikes — `paypa1`, `rnetamask`, Cyrillic characters.

### One rule that keeps this safe

**No third-party scripts on `www.pa9es.com`. Ever.**

Marketing and the dashboard share an origin. If you paste in a chat widget or ad pixel and it gets compromised, it runs next to the session cookie and can act as any logged-in user.

Enforce it with `script-src 'self'` on `www`, and use your own server-side analytics instead of a tag. Moving the dashboard to `app.pa9es.com` later is a DNS record and a middleware branch, so this isn't a trap.

### What one domain costs you

If a user's page gets Safe Browsing flagged at the **domain** level, the marketing site and login go down too. Usually flags are per-hostname and only kill that user, but the bad case exists.

Compensate: no JS or forms until a user has paid, send email from `mail.pa9es.com` with its own SPF/DKIM/DMARC, and be able to suspend a page in under a minute from your phone. Register in Search Console so Google warns you first.

Keep `PAGES_HOST` in config, never hardcoded. Buying a second domain later is then a config change plus permanent 301s from the old URLs.

---

## Username changes

Users can rename, as long as the new name is free. Two rules make it safe:

**Old URLs keep working forever.** `oldname.pa9es.com/*` → 301 → `newname.pa9es.com/*`. Wildcard DNS already resolves the old name, so this is just a lookup table.

**A released name is never re-registered — if it ever published a page.** This is the important one. If alice renames and bob claims `alice`, bob inherits her links, her traffic and her reputation. That's a free impersonation setup, and GitHub hit exactly this problem. Retired names stay retired.

Also:

- One change per 30 days.
- Charge credits for it (100 is reasonable) as an extra brake.
- Run the reserved list and homoglyph checks on rename, not just signup.
- Bust the host → user cache.
- Audit log it.

Table: `username_history(username, user_id, released_at)`. Never delete rows.

---

## Auth

**Better Auth.** It owns `users` and `sessions`, so those aren't in the schema below.

Keep `credits` in your own table keyed by user id — not as a field on Better Auth's user model. You don't want billing tangled up in auth library migrations.

Plugins used:

| Plugin | For |
|---|---|
| `username` | Usernames, availability check, rename |
| `admin` | Roles, ban, impersonate |
| `apiKey` | Agent access. Has per-key rate limits and a remaining-request counter built in |
| `twoFactor` | TOTP step-up for superadmin |
| `openAPI` | Spec generation |

### Two settings that matter

**`crossSubDomainCookies` must stay off.** Turning it on sets `Domain=.pa9es.com`, which hands the session cookie to every user page — exactly the attack the domain design prevents. This is the single most dangerous config flag in the project.

**The session cookie name must start with `__Host-`.** Better Auth names cookies `${prefix}.${name}` with a configurable `cookiePrefix`. Needs `Secure`, `Path=/`, and no `Domain`. Verify in devtools once and write a test — on a single domain this is what stops `evil.pa9es.com` shadowing your session.

---

## API and agents

The site should be usable by an AI agent without a human in the loop.

### MCP server

The main feature. Tools: `create_page`, `update_page`, `publish`, `list_pages`, `get_balance`.

An agent that just generated an HTML page can publish it in the same breath — no copy-paste. Since AI-generated pages are a core use case, this is the product, not a nice-to-have.

### API rules

- **API keys, not session cookies.** Scoped, revocable, with a per-key spend cap. An agent in a retry loop can drain a balance fast.
- **Idempotency keys on every billable write.** Agents retry on timeouts. Without this, one publish charges 100 credits twice. Client sends `Idempotency-Key`, you store it and replay the original response.
- **Return cost in the response.** `credits_charged` and `credits_remaining` on every billable call, plus a `dry_run` flag that returns the price without doing it. Agents can't budget against prices they can't see.
- **Errors built for machines.** Stable code, human message, `docs_url`. Agents recover from structured errors and flail on prose.
- **Boring REST.** No GraphQL, no clever pagination.

### Docs

- Markdown, served as markdown.
- `/llms.txt` at the root.
- OpenAPI spec at a stable URL.

### Caution

An API that publishes HTML at scale is an abuse vector at scale. Require a verified email before issuing API keys, and lean on the "no JS or forms until paid" rule — it does more work here than anywhere else.

---

## Pricing

**1 USD = 100 credits.** So 1 credit = 1 cent.

| Action | Cost |
|---|---|
| Publish a page | 100 credits ($1) |
| Republish (new version) | 10 credits |
| Save a draft / commit | Free |
| Change username | 100 credits |
| Signup bonus | 100 credits (first page free) |

Fixed price, not billed by time. **This means no nightly billing job, no suspensions, no grace periods.** Balance only changes when the user does something. Big simplification — build it this way.

Store credits as plain integers. If per-view billing later needs fractions, multiply every balance by 1000 in one migration.

The free first page publishes at the **unverified tier** — no JS, no forms. Paying unlocks them. That keeps payment as the anti-abuse gate.

**Put a dormancy clause in the ToS now:** no views in 12 months → archived, restore for credits. One-time payment for forever hosting is an open-ended promise otherwise, and you can't add this rule later without emailing everyone.

Per-view billing comes later.

---

## Version control

Single file, so no branches, no merges, no trees. Just:

- `blobs` — sha256 → gzipped HTML. Same content stored once.
- `commits` — id, page_id, parent_id, blob_hash, message, created_at.
- `pages.live_commit` — a pointer. Publishing moves it.

Revert = new commit pointing at an old blob. Never rewrite history. Diffs computed at read time with jsdiff.

Don't use real git. A parent pointer and a hash is the whole thing.

**Commits are free, publishing costs.** This matters because live editing and the AI editor will produce many versions. Charging per commit makes the AI editor unusable. Charging to move the live pointer is also honest — serving is what actually costs you.

---

## Data model

Better Auth owns `user`, `session`, `account`, `verification`, `apikey`. Yours:

| Table | What |
|---|---|
| `profiles` | user_id, credits, tier |
| `username_history` | username, user_id, released_at — never deleted |
| `pages` | user_id, path, live_commit, `UNIQUE(user_id, path)` |
| `commits` | page_id, parent_id, blob_hash, message |
| `blobs` | sha256 → gzipped HTML, plus scan verdict and extracted title |
| `ledger` | user_id, delta, reason, ref, `UNIQUE(reason, ref)` |
| `invoices` | chain, token, amount, reference, status |
| `idempotency_keys` | key, user_id, response, expires_at |
| `views_daily` | (page_id, day) → count |
| `audit_log` | admin actions |

The ledger is the truth. `profiles.credits` is a cache written in the same transaction. Never write it directly.

That `UNIQUE(reason, ref)` makes replayed payments and re-run jobs into no-ops.

Scan results live on the blob, keyed by hash — so identical content is never rescanned, and reverting to an approved version is instant.

---

## Storage

**Store HTML as text in the database**, keyed by content hash. At 512KB max, SQLite handles this better than the filesystem does for small files, and you back up one file instead of a database plus a directory that can drift out of sync with it.

**Never parse HTML when serving.** Serving is: host → username → path → live commit → blob → bytes, untouched. Rewriting on the way out is slow and breaks pages in weird ways.

Parse at **write** time and store the results: title, size check, external resources, whether it has scripts or forms, scan verdict.

The hash indirection makes moving to R2 later a drop-in swap.

---

## Payments

**EVM only for MVP. Base, USDC.**

1. User picks a pack. Server creates an invoice with the amount in base units **as a string** (6 decimals, never a float).
2. Payment page shows a QR and an EIP-681 link. State the chain and token loudly.
3. User pays a receiver contract: `pay(bytes32 invoiceId, uint256 amount)` emits an event. One treasury, no address sweeping.
4. A **separate watcher process** — not the request path — tracks `last_processed_block`. Websocket for speed, block scan for correctness: the scan catches what the socket dropped during a restart. Credit at the `finalized` block tag.
5. Credit in one transaction: ledger row keyed on `(chain_id, tx_hash, log_index)`, balance bump, invoice settled. That tuple is unique on-chain, so replays and reorgs collapse to one credit.
6. A reconciler re-scans recent blocks every few minutes to close gaps.

**Expect mistakes.** Wrong chain, wrong token, underpayment, late payment — all routine. Watch the treasury for any inbound transfer and put unmatched ones in `orphan_payments` with an admin screen. Credit partial payments proportionally, and say so at checkout.

Two hard rules: never credit from a client-side "I paid" button, and keep the treasury key off the web server. The watcher only needs read-only RPC.

---

## Security

### JavaScript: sandboxed, not banned

Enforce with a header, never by sanitizing HTML. Sanitizers lose the mXSS arms race; a CSP doesn't.

```
Content-Security-Policy: sandbox allow-scripts allow-popups
```

On a top-level document this gives the page an **opaque origin**: scripts run, but the page can't set cookies, use localStorage, register a service worker, or fetch same-origin.

| Tier | Policy |
|---|---|
| Free / unverified | `script-src 'none'`, `form-action 'none'` |
| Has paid | Sandboxed JS, forms allowed |

Note banning JS wouldn't stop phishing anyway — that's a plain `<form action="https://attacker/">`. `form-action` is the bigger lever.

### Scanning

Run all three on **every publish**, not just the first. Version control makes publish-clean-then-swap a one-click attack.

1. **Cheap checks first** — parse at upload. Off-site form actions, `eth_requestAccounts`, obfuscated JS, brand names, unknown iframes. Free and instant.
2. **Safe Browsing Lookup** on outbound links. Also register the domain in Search Console — being told when *you're* flagged is the more valuable direction.
3. **AI scan for intent** — brand impersonation, credential or seed-phrase requests. Triage, not a gate: high confidence blocks and queues for review, middle publishes with JS off, low publishes clean. Never ban on a model score alone.

Cloudflare isn't a content scanner. It gives you WAF, rate limiting, bot management, DDoS protection, and R2 later.

**Speed beats prevention.** Something always gets through. Suspending one page in a minute matters more than any scanner.

---

## Superadmin

Everything under `/superadmin/*` and `/api/superadmin/*`, with one middleware check per prefix. **Guard by location, not by memory** — a new endpoint is then protected by where the file lives, not by remembering to add a check. Never render admin-only bits inside normal user pages.

- **TOTP step-up** to enter, granting elevated status for ~30 minutes.
- **A separate account** from the one you use to test the product.
- **Credit adjustments go through the ledger** with `reason='admin_adjustment'`, your admin id, and a written justification. You're touching people's money.
- **Audit log everything**, including reading a user's page content and any impersonation. Better Auth's admin plugin gives you the mechanism, not the paper trail.

Don't give it its own subdomain — certificate issuance is published to public CT logs, and people scan those for admin panels.

Views needed: users list, pages list with scan verdicts, review queue for flagged content, orphan payments, per-page suspend.

---

## Analytics

Server-side, from the request itself. Pages with `script-src 'none'` can't run a beacon — which works out well: no JS, no cookies, no consent banner. "Privacy-first analytics, included" is a real selling point that costs nothing.

Per page: views per day, top referrers, country (from IP, discarded after aggregating), device type, and a **bot vs. human split**.

That last one isn't optional once per-view billing exists. Crawlers can be most of a small page's traffic, and charging users for bot hits is a billing bug, not an analytics gap.

Skip uniques, sessions, funnels, retention. All need identity, which means cookies and consent.

Keep raw rows ~48 hours, then roll up to `(page_id, day, dimension) → count`.

---

## Later

| Area | Next |
|---|---|
| Billing | Per-view charging |
| Editor | Live edit, preview, AI editor |
| Vanity URLs | `project.pa9es.com` as a premium purchase — the global namespace is now unused, so sell it |
| Second domain | Move pages to `pa9es.dev` when there's revenue. Keep 301s from old URLs forever |
| Chains | Solana, then Tron on demand — Tron means **USDT**, since Circle dropped USDC there in 2024 |
| Custom domains | Users' own domains. Needs per-hostname certs; Caddy's on-demand TLS handles it |
| Scale | Batch view writes → Redis → Postgres → CDN |

**Ceiling:** SQLite on one VPS handles low millions of views a month. Once a CDN sits in front, requests stop reaching you and view counting has to move to CDN logs.

---

## Open questions

For a lawyer or accountant, flagged now so they aren't a surprise:

- **Do credits expire?** Never expiring sells better, but unspent prepaid balances raise unclaimed-property issues in some places.
- **Money transmission / AML.** Selling prepaid credits for crypto may need registration depending on where you and your users are.
- **Tax.** Receiving stablecoins is usually a taxable event at that day's fiat value.
- **DMCA agent and takedown process.** Worth more than any disclaimer popup.
- **Host tolerance.** Some providers null-route your IP on the first abuse complaint. Check before launch.