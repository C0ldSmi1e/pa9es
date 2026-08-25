# pa9es — Design Doc

---

## What it is

Host a single HTML page. Sign up, upload or write your HTML, name it, and it's live at `yourname.pa9es.com/pagename`.

Pay with credits bought in USDC/USDT. No card, no subscription.

For people who have one HTML file and want it online in thirty seconds — landing pages, demos, AI-generated pages, experiments. Not a static site host: one file per page, no build step, no git repo.

---

## URLs

Everything on one domain for now.

| URL | What |
|---|---|
| `www.pa9es.com` | Marketing |
| `www.pa9es.com/app` | User dashboard + editor |
| `www.pa9es.com/admin` | Admin (me) |
| `alice.pa9es.com/blog` | A user's page |
| `alice.pa9es.com` | Index of alice's published pages |

**Rules that fall out of this:**

- Usernames are hostnames: lowercase letters, numbers, hyphens, max 63 chars. Check at signup.
- Can't do `page.user.pa9es.com` — wildcards only match one label. Path it is.
- Reserve before launch: `www`, `app`, `api`, `admin`, `mail`, `cdn`, `static`, `status`, `docs`, `help`, `blog`, plus brand names like `paypal`, `metamask`, `coinbase`. Also block lookalikes — `paypa1`, `rnetamask`, Cyrillic characters.
- The subdomain root lists the user's published pages (always on), in the owner's chosen order (see "Page order"). Unknown usernames and users with zero published pages get the identical 404. Unpublished drafts never appear.

## Key Features

In MVP, I need:

- [Better Auth](https://better-auth.com/) for auth, email and password
- email verification before sign-in (Resend)
- settings page (`/app/settings`)
- admin dashboard
  - user management
  - read-only project views (`src/server/actions/admin.ts` — separate from the
    owner-scoped actions, so those keep their userId-filter invariant): per-user
    page list (`/admin/users/[userId]`) and project inspection with rendered
    preview + commit timeline (`/admin/projects/[projectId]`). No content
    mutations — moderation is the ban button (banned owners' pages stop being
    served)
- user dashboard
- basic official site and relevant auth pages (signup, login)
- users can create or delete a project
- in a project, users can edit the html file
- a project should be unpublished by default, and can be publish and unpublished
- version control of a project (git-like: commit ≠ publish)

## Version model

- The editor's draft is the autosaved worktree; it is never served to visitors.
- A commit snapshots the draft (message required, versions v1, v2, …). Commits are immutable.
- Production is a pointer to one commit ("Make live" / "Unpublish" in the timeline). Rollback = make an older commit live.
- Restoring a commit overwrites the draft; the UI confirms first when uncommitted changes would be lost.

## Page order

- One manual order drives both surfaces: `project.sort_order` (ascending)
  sorts the dashboard list and the subdomain index alike. Drafts hold their
  slot in the dashboard but never appear publicly.
- No backfill: existing rows sit at the default (0) and reads tie-break on
  recency (dashboard: `updatedAt`, index: `publishedAt`), so accounts that
  never reorder keep the old ordering. The first reorder persists the list
  as currently shown.
- New pages land on top: creation inserts with `min(sort_order) - 1` per
  user (same subquery pattern as `commit.v`).
- Reordering: drag the ⠿ handle on `/app` (pointer events, works on touch;
  the handle is focusable and arrow keys move the row). Settled changes are
  debounced into one `POST /api/projects/reorder` with the full ordered id
  list; the action rewrites positions 0..n in a transaction, owner-scoped
  per id. It's lenient about drift — deleted ids are skipped, unmentioned
  projects keep their slot — and the client is optimistic, reverting to the
  last confirmed order on failure.
- A reorder is not an edit: `updatedAt` is deliberately left untouched, so
  the admin views' recent-activity sort stays meaningful (admin project
  lists keep sorting by `updatedAt`, not the owner's manual order).

## Credits

- Bookkeeping is an append-only ledger (`credit_ledger`): one signed entry per
  balance change, in internal units (`credits.scale` units = 1 displayed
  credit — see `src/config/constants.ts`). Entries are never edited or
  deleted; corrections are compensating entries. `user.credit_balance` is the
  denormalized sum, updated in the same transaction as every entry
  (`src/server/actions/credits.ts`).
- Idempotency: at most one entry per `(kind, refId)` (unique index; NULL
  refIds don't collide). Replayed grants/charges are silent no-ops.
- Pricing lives in config only; the ledger records amounts as charged at the
  time. Current policy: signup grants `credits.signupBonus`; the first-ever
  go-live of a project charges `credits.publishCost`, atomically with the
  publish, keyed on the project id — so republish after unpublish and
  rollbacks are free by idempotency. Insufficient balance →
  `PaymentRequiredError` → 402; no refunds on unpublish/delete.
- Kinds are an open set (`signup_bonus`, `publish_charge`,
  `admin_adjustment`, `referral_bonus`, `referral_reward`, and future
  `purchase` / `ai_usage`). Payment rails and new charge types are just new
  entry writers — no schema change.
- Surfaces: balance chip on `/app`, balance + history + pricing note in
  `/app/settings`, admin grant/deduct (signed `admin_adjustment`, optional
  note) on `/admin/users/[userId]` via `POST /api/admin/credits`; own balance
  and history at `GET /api/credits` and `GET /api/credits/ledger`.

## Referrals

- Attribution: any `?ref=<username>` landing sets a 30-day `pa9es_ref` cookie
  (`ReferralCapture` in the root layout; last-touch wins). At signup, auth's
  `user.create.before` hook resolves the cookie to a user id and stamps
  `user.referred_by` (id, not username — survives future username changes;
  FK set-null). The field is `input: false`, so the signup request body can
  never set it directly; bad or unknown refs never block signup. Self-referral
  is structurally impossible.
- Rewards (amounts in `referrals` config, both keyed on the referee's id):
  referee gets `refereeBonus` (`referral_bonus`) at signup on top of the
  signup bonus — safe because unverified accounts can't sign in and referee
  credits can't be aggregated. Referrer gets `referrerBonus`
  (`referral_reward`) when the referee first publishes: `makeLive` calls
  `maybeRewardReferrer` in its transaction, and the ledger key makes it
  once-per-referee-ever; `maxRewards` caps a referrer's lifetime rewards.
  Clawbacks are compensating entries + the ban button.
- The growth loop: the "hosted on pa9es" footer on every subdomain index
  carries `?ref=<owner>` — published authors are attributed acquisition
  channels. Author page HTML stays untouched.
- Surfaces: referral link + stats (signups / published / earned) in
  `/app/settings`; "referred by" row on `/admin/users/[userId]`.

## Email

- Resend for transactional email (`RESEND_API_KEY`, `EMAIL_FROM`). Without a key, dev logs emails (their links) to the server console instead of sending; production refuses to run the send.
- All templates live in `src/server/emails/templates.ts` — pure `{ subject, html }` functions; delivery lives in `src/server/emails/send.ts`.
- Signup requires verification: no sign-in until the emailed link (1h expiry) is clicked. Clicking verifies, signs in, and lands on `/app`. An unverified sign-in attempt re-sends the link; expired/invalid links redirect to `/login` with a notice.
- Forgot password: `/forgot-password` emails a single-use reset link (1h expiry) that lands on `/reset-password`. The response never reveals whether the email is registered. A completed reset revokes every session (unlike change-password, which keeps the calling browser signed in).

In the future, I need:

- AI audit
- AI coding assistant
- user profile and project info update
- crypto payment for credits, and some operations like publish should consume credits
- AI native docs and APIs
- Analystics
