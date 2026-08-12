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

**Rules that fall out of this:**

- Usernames are hostnames: lowercase letters, numbers, hyphens, max 63 chars. Check at signup.
- Can't do `page.user.pa9es.com` — wildcards only match one label. Path it is.
- Reserve before launch: `www`, `app`, `api`, `admin`, `mail`, `cdn`, `static`, `status`, `docs`, `help`, `blog`, plus brand names like `paypal`, `metamask`, `coinbase`. Also block lookalikes — `paypa1`, `rnetamask`, Cyrillic characters.

## Key Features

In MVP, I need:

- [Better Auth](https://better-auth.com/) for auth, email and password
- email verification before sign-in (Resend)
- settings page (`/app/settings`): change password — revokes all other sessions
- admin dashboard
  - user management
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

## Email

- Resend for transactional email (`RESEND_API_KEY`, `EMAIL_FROM`). Without a key, dev logs emails (their links) to the server console instead of sending; production refuses to run the send.
- All templates live in `src/server/emails/templates.ts` — pure `{ subject, html }` functions; delivery lives in `src/server/emails/send.ts`.
- Signup requires verification: no sign-in until the emailed link (1h expiry) is clicked. Clicking verifies, signs in, and lands on `/app`. An unverified sign-in attempt re-sends the link; expired/invalid links redirect to `/login` with a notice.

In the future, I need:

- AI audit
- AI coding assistant
- user profile and project info update
- crypto payment for credits, and some operations like publish should consume credits
- AI native docs and APIs
- Analystics
