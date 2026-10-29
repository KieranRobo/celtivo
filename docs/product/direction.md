# Product direction

_Agreed 2026-10-29. Open for review — change this file when the direction changes._

## What Celtivo is

Group travel, minus the admin. One place where a group's trip lives — the plan, the bookings,
the documents and, later, the money — so the organiser stops being the group's spreadsheet and
the group stops scrolling WhatsApp for "what time do you land?".

## The first feature: forward it to the trip

Each trip gets a private inbound address, e.g. `ski-trip-2027-x7k2@in.celtivo.com`. Members
forward any booking email — flights, stays, trains, events, PDF e-tickets — and Celtivo extracts
the details onto a shared **trip board**:

- the itinerary, in order, in local times
- who arrives when, and who hasn't added their travel yet
- where we're staying, check-in times, addresses
- the documents people need to hand during the trip

### Why this first

- **Unique value on its own.** "Forward it and the whole group can see it" is something groups
  can't easily get today. Expense splitting alone would compete head-on with Splitwise and
  Tricount, which groups already have installed.
- **Almost zero effort to contribute.** Forwarding an email is the lowest-friction input there is.
  No forms, no app.
- **It builds the data later features need.** Every booking carries an amount and a payer — the
  raw material for expense splitting.
- **It spreads itself.** Every trip sends a link to the whole group.
- **Forwarding sidesteps inbox access.** Scanning Gmail automatically would need Google's
  restricted-scope security assessment (slow, expensive). Forwarding needs none.

### Positioning

Email forwarding isn't new: TripIt and Wanderlog both offer it, but they are built around an
individual traveller or an itinerary planner. Celtivo is **group-first**: who has booked and who
hasn't, who arrives when, nudges for the gaps — and later, who owes whom.

### Risks we design around

1. **It must be useful with one forwarder.** In a group of nine, maybe two people forward
   anything at first. The organiser's emails alone (usually the accommodation) must produce a
   useful board. The gaps then become the group feature: "6 of 9 flights added — waiting on Sam,
   Aoife, Jack" with a nudge.
2. **People need a reason to come back.** Forwarding is one-off; the return visits happen
   _during_ the trip ("what's the address?", "when does Jack land?", "where's my e-ticket?"). The
   board must be excellent on a phone, and later work offline.
3. **Trust depends on accuracy.** One wrong flight time and the group stops trusting the board.
   Extracted data gets a quick review step, every field is editable, and time zones are handled
   deliberately.
4. **Booking emails are sensitive.** They contain passport numbers, addresses, payment details,
   and booking references that can be used to cancel someone's flight. See
   [email-ingestion.md](./email-ingestion.md#privacy-and-security).

## Principles

- **No app and no password to join.** Tap the invite link, add your name, you're in. Accounts
  (email code sign-in) are for organisers and for anyone who wants to forward emails.
- **Mobile-first web.** Every screen is designed for a phone first; the web app is also what the
  mobile apps will wrap.
- **The group sees extracted details, never raw emails.** Booking references are hidden by
  default.
- **Inbound email is untrusted data.** The AI only extracts; it never acts on instructions written
  inside an email.
- **Money is stored as integer minor units** (cents/pence), never floats.
- **Domain logic stays out of the UI.** Shared infrastructure lives in `src/server/`,
  feature logic in `src/features/<name>/server/` (guarded with `server-only`), exposed through
  Route Handlers. Server Actions are thin wrappers over the same functions. A future native client
  could then reuse the API unchanged.

## Deferred — with what we already know

### Expense splitting (after the trip board)

Bookings ingested by the trip board feed it: "Split this?" on any booking with an amount.
Challenges already identified:

- **Rounding.** €10 ÷ 3 = 3.34 + 3.33 + 3.33 — the spare cent must land deterministically.
- **Split types.** Equal, exact amounts, shares, excluding people, one person paying for a couple.
- **Derive balances, never store them.** Edits and deletes are constant.
- **Edit history.** Money arguments are trust arguments — record who changed what, when.
- **Multi-currency.** Fix the rate when the expense is entered (ECB daily rates as the default,
  user override allowed), settle in one trip currency.
- **Settling up.** Suggest the fewest transfers (a greedy algorithm is fine; explain the "why").
  **Record** payments and link out to Monzo.me / Revolut / PayPal.me / IBAN — never hold or move
  money ourselves (FCA / e-money regulation).
- **Identity.** Duplicate names, claiming a name later, can't delete a member with a balance.

Suggested v1: equal / exact / shares splits, one settlement currency with per-expense foreign
currency at a fixed rate, balances, suggested transfers, mark-as-paid, edit history.

### Mobile apps (once there's something worth putting in the stores)

- **Approach: Capacitor** wrapping the live site (`server.url` → celtivo.com). One codebase; web
  deploys reach the apps instantly. A bundled static export is not an option because the app
  relies on Route Handlers, Server Actions and Cache Components.
- **Why not React Native:** every screen would be built twice (web must stay complete because most
  guests never install anything). Revisit only if mobile becomes the primary surface or needs
  heavy offline/native interaction — the API-first structure above keeps that door open.
- **Apple Guideline 4.2** rejects "just a website" apps: ship with native value — push
  notifications, the share sheet, camera for receipts, haptics.
- **Sign-in:** Google blocks OAuth in embedded webviews; email codes avoid this. Offering Google
  sign-in also obliges Sign in with Apple.
- **Invite links** open the app when installed via universal links / app links
  (`/.well-known/apple-app-site-association`, `assetlinks.json`).
- **Costs:** Apple Developer Program $99/year; Google Play $25 once. Free development is possible
  on simulators/emulators and your own devices, but push, universal links and TestFlight need the
  paid Apple account. New personal Google Play accounts must run a closed test (12 testers, 14
  days) before going public — start that clock early. Enrolling as a company needs a D-U-N-S
  number (free, 1–2 weeks).
- **Store requirements:** privacy policy URL, support URL, privacy labels / data safety form,
  in-app account deletion, screenshots.
- **Payments:** real-world services (travel, splitting bills) are exempt from in-app purchase
  rules; Stripe is fine.

A cheap first step is making the web app an installable PWA (`app/manifest.ts`, safe-area
insets).

### Planning and booking

Polls, date-finding and stay shortlists come after the trip board. In-app booking and "each
friend pays their own share to the booking" (Stripe Connect, regulated payments) are a much later,
separate project.

## Decision log

| Date       | Decision                                                      | Why                                                                              |
| ---------- | ------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| 2026-10-29 | Email-forwarding trip board is the first feature              | Unique standalone value; builds the data expenses need; avoids a Splitwise fight |
| 2026-10-29 | Expense splitting follows, fed by ingested bookings           | Pairs with the board ("split this?") instead of competing on its own             |
| 2026-10-29 | Extraction: schema.org markup first, Claude as fallback       | Free and exact where present; AI handles the long tail                           |
| 2026-10-29 | Record settlements, never move money                          | Holding or moving funds brings FCA / e-money regulation                          |
| 2026-10-29 | Mobile via Capacitor wrapping the live site, not React Native | One codebase; web must stay complete for guests who never install anything       |
| 2026-10-29 | Business logic in server modules exposed via Route Handlers   | Keeps Server Actions thin and leaves a native client possible without a rewrite  |
