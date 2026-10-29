# Roadmap

The build plan for the first feature — the email-forwarding trip board — and what follows. Why
it's ordered this way is in [direction.md](./direction.md); pipeline details are in
[email-ingestion.md](./email-ingestion.md).

## Working on a phase

Each phase is sized so that one Claude session (or a few) can scope it, then build it:

1. Start a session with: _"Scope phase N from docs/product/roadmap.md."_ The session reads this
   file plus the linked docs, resolves the open questions with you, and writes a detailed plan.
2. Build it in the same or a later session.
3. Update this file in the same change: tick the phase's status, move resolved open questions
   into the decision log in `direction.md`, and adjust later phases if something was learned.

Status: ⬜ not started · 🟨 in progress · ✅ done

## Already built

- Landing page (Celtivo Landing Light design) and the create-trip screen.
- `POST /api/trips` — validates with Zod and echoes back; **no database yet**.
- `GET /api/health`, Docker image, deployed on Dokploy behind Cloudflare.

---

## Phase 0 — Extraction prototype ⬜

**Goal:** prove extraction is accurate enough and learn what it really costs, before building
any infrastructure.

**Scope**

- `scripts/extract-booking.ts`: `.eml` → schema.org check → HTML-to-text → Claude extraction
  with structured output → Zod-validated booking.
- `fixtures/emails/` with 30–50 real confirmation emails (flights, Airbnb, Booking.com, hotels,
  trains, events, PDF e-tickets, a reschedule, a cancellation). **Real emails contain personal
  data — keep them out of git** (gitignored folder, or anonymised copies only).
- A draft `bookingSchema` in `src/features/bookings/schema.ts` — the start of the real one.
- Output per email: the extracted booking, which path produced it (schema.org / AI), tokens,
  and cost.
- Compare models on the same set; record accuracy (especially times and time zones) and cost.

**Out of scope:** the database, inbound email, any UI.

**Done when:** we have accuracy and cost numbers per model, a chosen default model, and a list
of email types that fail.

**Open questions:** which model meets the accuracy bar? How often is schema.org markup present
in practice? Are PDFs needed in v1?

---

## Phase 1 — Foundations: database, accounts, real trips ⬜

**Goal:** trips and members exist for real, and people can sign in.

**Scope**

- Postgres on Dokploy; Drizzle ORM, migrations, a local dev database (docker compose).
- `src/server/db` (client, `server-only`), env var handling, Dokploy env setup.
- Tables: users, user_emails, trips, members (see the data model sketch in email-ingestion.md).
- Sign-in by **email one-time code** (works in mobile webviews later; no passwords).
- Replace the `/api/trips` stub with real trip creation; the invite link
  (`/join/<slug>`) lets someone join with just a name.
- Trip page shell at `/trip/<slug>` (the URL the landing page already shows).
- Build `/sign-in` (currently 404s).

**Out of scope:** inbound email, bookings.

**Done when:** an organiser can sign in, create a trip, share the link, and see who has joined —
on the deployed site.

**Open questions:** auth library (Better Auth / Auth.js / a small hand-rolled email-code flow)?
Which provider sends transactional email (codes, nudges)? Can a guest who joined by name later
claim their member record with an email?

---

## Phase 2 — Inbound email pipeline ⬜

**Goal:** an email forwarded to a trip's address becomes a stored, extracted booking awaiting
review.

**Scope**

- Per-trip inbound address on `in.celtivo.com`; MX + Cloudflare Email Routing catch-all → Email
  Worker → `POST /api/inbound/email` (shared-secret check).
- Raw message to R2; `inbound_emails` row; job enqueued.
- Worker service (second Dokploy app from this repo) with a Postgres-backed queue.
- Sender rules: verified member addresses only, SPF/DKIM pass; others to an approval queue.
- Extraction from phase 0 wired in; bookings saved as "pending review".
- Dedupe (message-id, content hash, booking reference + provider).
- Abuse controls: per-trip daily extraction cap, token usage logged per email, Anthropic Console
  spend limit.

**Out of scope:** the board UI beyond a basic list for testing.

**Done when:** forwarding a real booking email from a member's address produces a correct
pending booking within a minute on production, and duplicates and unknown senders are handled.

**Open questions:** Cloudflare Email Workers vs Postmark Inbound? pg-boss vs graphile-worker?
Address format (slug + random token vs token only)?

---

## Phase 3 — The trip board ⬜

**Goal:** the thing people actually use — on a phone first.

**Scope**

- Review step: "check this" cards for pending bookings, every field editable, confirm or discard.
- Itinerary timeline in local times; stays with address and check-in; events.
- **Who arrives when**, and **who's missing** ("6 of 9 flights added") with a nudge (email; WhatsApp
  share link).
- Map booking travellers to members (fuzzy name match + confirm).
- "How to forward" help: copy address, add as contact, short instructions per mail app.
- Privacy defaults: booking references hidden; raw emails never shown.
- Documents attached to bookings (e-tickets) viewable by the travellers on them.

**Out of scope:** expenses, polls, offline support.

**Done when:** a real group can run a real trip on it — the organiser forwards the stay, others
forward flights, everyone can see arrivals on their phone.

**Open questions:** what does an empty board look like on day one? Who can edit or delete a
booking — forwarder, organiser, anyone?

---

## Phase 4 — Hardening ⬜

**Goal:** handle the messy reality before inviting strangers.

**Scope**

- Reschedules and cancellations update existing bookings.
- PDF e-tickets and boarding passes (if not already done).
- Time zone and date-format edge cases from phase 0's failure list.
- Retention job: delete raw emails/attachments after the agreed period.
- Rotate a trip's address; remove a member; delete account (required later by the app stores).
- Error monitoring and basic product analytics.

**Done when:** the failure list from phase 0 and real usage is worked through, and retention and
deletion run automatically.

---

## Phase 5 — Launch readiness ⬜

**Goal:** ready for people who don't know us.

**Scope**

- Landing page copy rewritten around "forward your bookings to the trip" (it currently pitches
  polls, booking and payments).
- Privacy policy and terms; `/support` page (currently 404s).
- Installable PWA: `app/manifest.ts`, icons, safe-area insets.
- Data-processing terms with every provider in the pipeline.

**Done when:** a stranger can find the site, understand it, sign up, and run a trip without help.

---

## Later

Not yet scoped into phases; notes are in [direction.md](./direction.md#deferred--with-what-we-already-know).

- **Expense splitting** — "split this?" from bookings, then manual expenses, balances and settle-up.
- **Mobile apps** — Capacitor shell, push notifications, share-to-Celtivo, universal links.
- **Planning tools** — polls, date-finding, stay shortlists.
- **Booking and payments** — in-app booking; each friend pays their own share.
