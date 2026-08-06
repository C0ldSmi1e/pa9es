# pa9es — Design Doc

*Status: design settled, multi-tenant build not started. A working single-user prototype exists (see Appendix).*

---

## What it is

A hosting service for single-page HTML. You sign up, write or upload an HTML file in a browser editor with live preview, name a path, and it's live at `yourslug.pages.mydomain.com`.

Paid for with prepaid credits bought in USDC. No card, no subscription, no invoice on the 1st.

**Who it's for:** people who have one HTML file and want it on the internet in thirty seconds — landing pages, demos, AI-generated pages, one-off experiments. It is deliberately not a static site host: one page, one file, no build step, no git.

**Why credits rather than a plan:** crypto has no pull payments. You cannot charge a wallet on a schedule. Prepaid is the model that actually fits the rails, not a preference.

---

## How it works

1. Sign up with email, verify it. Account starts with 5 free credits.
2. Create a page: name a path, upload an `.html` or start from a blank document.
3. Edit in a split-pane editor — code left, live preview right. Save publishes immediately.
4. The page is live at `slug.pages.mydomain.com`.
5. Credits drain daily: a small standing charge per page, plus traffic.
6. Buy more with USDC when the balance runs low. At zero, pages are suspended — not deleted — and the editor keeps working so you can pay and come back.

---

## Architecture

### Two origins

| Host | Serves | Notes |
|---|---|---|
| `app.mydomain.com` | The app: auth, dashboard, editor, billing | Session cookie scoped here only |
| `*.pages.mydomain.com` | User HTML | Never sets a cookie, never returns CORS headers |

This split is the entire security model. Path-based hosting (`mydomain.com/slug`) would put user JavaScript on the app's origin, where it could call the API with the visitor's session cookie attached. No header fixes that — `httpOnly` stops JS reading the cookie but the browser still sends it, and `SameSite` doesn't apply to a same-site request. Separate origins remove the problem by construction.

Wildcard DNS `*.pages` → the VPS. Wildcard cert via Let's Encrypt **DNS-01** (HTTP-01 cannot issue wildcards). Requests hit the app with the slug in the `Host` header; middleware rewrites by host.

### Data model

Balances are held in **units**: 1 credit = 1,000 units, the way money is held in cents. Metering divides evenly at that resolution so nothing is lost to rounding.

| Table | Purpose |
|---|---|
| `users` | email, password hash, verified_at, `balance_units`, suspended_at |
| `sessions` | hashed token, expires_at — a table, not a stateless cookie, so sessions can be revoked |
| `pages` | slug (PK, globally unique — it's a hostname), user_id, html, status |
| `revisions` | last 20 versions per page |
| `ledger` | user_id, delta_units, reason, ref, **unique(reason, ref)** |
| `invoices` | chain, token, amount, destination, reference, status |
| `views_daily` | (slug, day) → count |
| `meter_runs` | day PK, claims the nightly job |

The ledger is the source of truth; `balance_units` is a cache written in the same transaction. The unique constraint on `(reason, ref)` makes webhook replays, re-run metering jobs, and reprocessed blocks all no-ops.

### Serving a page

Host → slug → page and owner status from a small in-process cache (30s TTL, invalidated on save). Suspended owner gets a 402 placeholder. Otherwise the HTML with `no-store` and `nosniff`.

Views go into an in-memory buffer flushed every few seconds as an upsert — not one database write per request. Losing a few counts on a crash is acceptable; it errs in the user's favour.

---

## Pricing and metering

| Constant | Value |
|---|---|
| 1 credit | 1,000 units |
| Base charge | 33 units per live page per day (≈1 credit per page per month) |
| Traffic | 1 unit per view (1 credit = 1,000 views) |
| Signup bonus | 5 credits |
| Grace | 3 credits below zero before suspension |

A page needs roughly 33 views a day before traffic outweighs the base charge, so the story is "hosting is basically free, traffic is what costs." The base charge exists to cover storage and to make abandoned pages disappear on their own.

**Nightly job** (00:10 UTC, bills the previous day):

1. Claim the day in `meter_runs` — a double-triggered cron does nothing.
2. Base charge across live pages.
3. Traffic charge from `views_daily`.
4. One ledger row per user, per day, per reason, `ref` = the date.
5. Recompute balances, suspend anyone past grace, email warnings.

Per-day rows rather than per-event rows keep write volume bounded and the whole run replayable.

**Lifecycle:** above zero → live. Zero to −3 credits → live, with warning emails. Below → 402 placeholder, editor still works. HTML purged after 60 suspended days, row retained.

---

## Payments

**MVP: EVM only. Base, native USDC.** One viem adapter, one receiver contract, one idempotency key. Adding Arbitrum or Polygon later is a config row — chain id, RPC, token address.

**Flow**

1. User picks a pack. Server creates an invoice: chain, token, amount in base units **as a string** (6 decimals, never a float), destination, reference, expiry.
2. Payment page shows a QR and an EIP-681 deep link, with the chain and token stated loudly.
3. User pays a receiver contract: `pay(bytes32 invoiceId, uint256 amount)` emits an event. USDC's ERC-3009 `transferWithAuthorization` makes it one signature instead of approve-then-pay. One treasury, no address sweeping.
4. A **separate watcher process** — never the request path — keeps a `last_processed_block` cursor. Websocket subscription for latency, block scan for correctness: the scan is what catches events dropped during a restart. Credit at the `finalized` block tag.
5. Credit in one transaction: ledger insert keyed on `(chain_id, tx_hash, log_index)`, balance bump, invoice settled, suspension lifted. That tuple is unique on-chain, so replays and reorg-reinclusion collapse to a single credit.
6. A reconciler re-scans the last N blocks every few minutes to close gaps.

**Packs:** 100 credits / $5 · 500 / $20 · 2,000 / $70. Stablecoins mean no rate lock and no volatility window.

**Build for the mess from day one.** Wrong chain, wrong token, underpayment, overpayment, payment after expiry — all routine. Watch the treasury for *any* inbound transfer and drop unmatched ones into an `orphan_payments` table with an admin resolution view. Credit partial payments proportionally and say so at checkout.

Two hard rules: never credit from a client-side "I paid" button, and keep the treasury key off the web server. The watcher only needs read-only RPC.

---

## Security and abuse

### Cookie isolation

- Session cookie uses the **`__Host-`** prefix — browsers reject it unless it has no `Domain` attribute and arrived over HTTPS from that exact host, so a sibling subdomain can't shadow it.
- Submit `pages.mydomain.com` to the **Public Suffix List**, so nothing under it can set cookies on the parent.

### JavaScript: sandboxed, not banned

Enforced by header, never by sanitizing HTML — sanitizers lose the mXSS arms race, a CSP doesn't.

```
Content-Security-Policy: sandbox allow-scripts allow-popups
```

Applied to a top-level document, this gives the page an **opaque origin**: scripts run, but the page cannot set cookies, use `localStorage`, register a service worker, or fetch same-origin. The product survives; the weapon doesn't.

**Tiered by trust:**

| Tier | Policy |
|---|---|
| Unverified | `script-src 'none'`, `form-action 'none'` |
| Verified email | Sandboxed JS |
| Has purchased credits | Sandboxed JS, forms allowed |

Requiring a real on-chain payment before JS and forms unlock destroys bulk-abuse economics better than any classifier — and a payment address is an identity anchor that's harder to churn than a disposable inbox.

Note that banning JS wouldn't stop phishing anyway: credential theft is a plain `<form action="https://attacker/">`. `form-action` is the bigger lever than `script-src`.

### Screening

- **Slug blocklist** — reject or flag `paypal`, `metamask`, `coinbase`, `wallet`, `login`, `verify`, `airdrop`, `claim`. Costs nothing, prevents a large share of phishing before it exists.
- **AI scan on every save, not just create** — the editor makes publish-clean-then-swap a one-click attack. High confidence blocks and queues for human review; middle publishes with JS disabled; low publishes. Never terminate on a model score alone.
- **Google Safe Browsing, inbound first** — register the pages host in Search Console so Google tells you when you've been flagged. Use the Lookup API on outbound links too, but it's a floor, not a wall: a fresh phishing page is on no list yet.
- **Abuse reporting at a fixed app URL**, plus an `abuse@` mailbox and `/.well-known/security.txt`. Not injected into user pages — that breaks layouts and is spoofable. What matters is the triage SLA behind it.
- **Interstitials only where they earn it** — first visit to a page from an unverified account, or one the scanner flagged. Not a modal on every pageview; users dismiss those reflexively and it wrecks the product.

**Response speed beats prevention.** Suspending a single page in under a minute, from a phone, matters more than any scanner. Something always gets through.

---

## Analytics

Server-side, derived from the request. Pages with `script-src 'none'` can't run a beacon — which lands in a good place: no JS, no cookies, no persistent identifier, no consent banner. "Privacy-first analytics, included" is a real line on the pricing page and costs nothing, because the views are being counted for billing regardless.

Shown per page: views per day, top referrers, country (from IP, discarded after aggregation), device class, and a **bot vs. human split**.

That last one isn't a nicety. Crawlers and scanners can be most of the traffic to a small page, and every hit currently drains a customer's credits. Untreated, that's a billing defect, not an analytics gap — so bot classification is required anyway, and showing billed alongside filtered counts is what makes credit consumption legible enough to trust.

**Out of scope:** uniques, sessions, funnels, events, retention. All need identity, which means cookies or fingerprinting and the consent obligations that follow.

**Retention:** raw rows ~48 hours for debugging, then rolled up to `(slug, day, dimension) → count` as part of the nightly billing job.

---

## Later

| Area | Next step |
|---|---|
| Chains | Solana (Solana Pay `reference` makes matching clean), then Tron on demand — note Tron means **USDT**, since Circle discontinued USDC there in 2024 |
| Custom domains | Users pointing their own domains at pages. Wildcards can't cover this; each needs a cert on demand. A good reason to run Caddy rather than nginx from the start |
| Scale | Batch view writes → Redis counters → Postgres → CDN in front of the pages host |
| Analytics | Approximate uniques via a daily-rotating salted hash, salt discarded nightly |
| Product | Multiple pages per project, assets beyond a single HTML file, page templates |

**Scaling ceiling:** SQLite on one VPS carries this into the low millions of views a month. The day a CDN goes in front of the pages host, view counting has to move to CDN log ingestion — requests stop reaching the origin.

---

## Open questions

- **Do credits expire?** Never expiring is cleanest to sell, but unspent prepaid balances raise unclaimed-property questions in some jurisdictions.
- **Money transmission / AML.** Selling prepaid credits for crypto may trigger registration depending on where you and your users are.
- **Tax.** Receiving stablecoins is generally a taxable event at the fiat value on the day.
- **DMCA agent and notice-and-takedown procedure** — worth more than any disclaimer popup.
- **Hosting provider tolerance.** Some null-route an IP on the first abuse complaint. Worth researching before launch, not after.

*The five above are lawyer and accountant questions, flagged here so they aren't discovered late.*

---

## Appendix — prototype

A working single-tenant version was built earlier: Next.js 15 App Router, SQLite, password auth, CodeMirror editor with debounced `srcdoc` preview, page CRUD, revision history. It predates the multi-tenant decisions above — no accounts, no credits, path-based serving — so treat it as a reference for the editor and serving layer rather than a starting point for the platform.