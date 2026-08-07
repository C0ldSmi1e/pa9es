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
- admin dashboard
  - user management
- user dashboard
- basic official site and relevant auth pages (signup, login)
- users can create or delete a project
- in a project, users can edit the html file
- a project should be unpublished by default, and can be publish and unpublished

In the future, I need:

- version control of a project
- AI audit
- AI coding assistant
- user profile and project info update
- crypto payment for credits, and some operations like publish should consume credits
- AI native docs and APIs
- Analystics
