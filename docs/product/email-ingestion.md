# Email ingestion — design notes

Technical notes for the forwarding pipeline behind the trip board. These are the starting point
for scoping, not a final spec — confirm or revise them in the phase that builds each part (see
[roadmap.md](./roadmap.md)).

## Pipeline

```
member forwards → <name-slug>-<token>@celtivo.space
  → Cloudflare Email Routing (catch-all on celtivo.space) → Email Worker
      1. save the raw message to R2          the email is safe from here on
      2. POST /api/inbound/email with the R2 key, envelope and raw header block
      3. app answers 404 (no such trip) → setReject, delete the object
         app unreachable → leave an unacked/ marker; a cron sweep retries every 15 min
  → POST /api/inbound/email        verify the shared secret, find the trip by token, parse
                                    the headers, dedupe, insert inbound_emails and NOTIFY
                                    in one transaction, return 200
  → extraction job (in the app)    woken by NOTIFY (and a 1-minute poll); claims the row
                                    1. read the raw message from R2, parse it
                                    2. pre-filter: could any extractor's kind be in here?
                                    3. schema.org JSON-LD → bookings (free, exact)
                                    4. otherwise HTML → text, Claude with structured output
                                    5. each extractor validates and saves its bookings;
                                       a known booking reference matches, not duplicates
  → Postgres (Drizzle)             bookings awaiting review → trip board
```

- **A dedicated inbound domain, `celtivo.space`:** its own Cloudflare zone, used only for trip
  mail, so celtivo.com's mail provider is never touched. A subdomain of celtivo.com doesn't
  work: Email Routing on a subdomain has to be set up through the apex domain's Email Routing,
  which takes over celtivo.com's MX records, and catch-all rules are apex-only anyway.
- **Address format:** `<name-slug>-<token>@celtivo.space`, e.g.
  `ski-trip-2027-7hd2kq9x@celtivo.space`. Only the token (after the last `-`) is looked up; the
  name part is there to reassure the sender and is ignored, so renaming a trip doesn't break its
  address. The token is its own rotatable column on `trips`, not the URL slug (which is shared
  in invite links).
- **Why the Worker writes to R2 first:** an Email Worker can't return a temporary failure
  (`setReject` is a permanent bounce, and an uncaught throw is undocumented), so if it only
  relayed to the app, mail sent during a deploy or outage would be lost. Saved in R2 first, it
  survives; a sweep picks up any object the app never acknowledged. It also keeps 25 MiB
  bodies off the Next server, and the Worker's R2 binding needs no credentials.
- **Raw storage:** raw `.eml` files go to R2 (`celtivo-inbound` bucket), not Postgres or the
  VPS disk. An R2 lifecycle rule deletes them after 30 days. Cost is effectively zero: the free
  tier (10 GB-month, 1M writes) covers ~30k emails a month at ~300 KB each; 100k a month is
  ~$0.30. Cloudflare already handles every email via Email Routing, so R2 adds no new data
  processor. The app reads objects back with an R2 API token (S3-compatible API).
- **Why a job:** extraction takes seconds; the inbound webhook must answer immediately. The
  job runs inside the app server, with `inbound_emails` as its queue (see
  [Extract (phase 2b)](#extract-phase-2b)). It's self-contained, so it can move to its own
  Dokploy service later without changing how it's triggered.
- **Inbound provider:** Cloudflare Email Routing + Workers (free, already in our stack; we parse
  MIME ourselves with `postal-mime`). Postmark Inbound (parsed JSON, paid) remains the fallback.
- **Keep the Email Worker dumb:** it stores and notifies, nothing more. MIME parsing, sender
  checks and extraction live in the app, where they're testable against `.eml` fixtures.

## Receive and store (phase 2a)

The first slice stores every email for a known trip, with no body parsing or AI. It is built
so that extraction slots in later without changing what's stored. Deploy steps are in the
README ("Inbound email").

**Cloudflare setup**

1. ✅ Register `celtivo.space` and onboard it to Email Routing.
2. Test the catch-all: forward `*@celtivo.space` to a verified inbox and send to any address
   from a different account.
3. Create the R2 bucket `celtivo-inbound` in the EU jurisdiction (personal data of UK/EU
   travellers; the jurisdiction can't be changed later) with a 30-day lifecycle rule.
4. Deploy the Worker (Wrangler, kept in this repo under `workers/inbound-email/`) and switch
   the catch-all's action to it.

**App side**

- `trips.inboundToken` — 8 random characters, unique; existing trips were backfilled by the
  migration.
- `inbound_emails` — `tripId`, `rawKey`, `rawSize`, `envelopeFrom`, `envelopeTo`,
  `headerFrom`, `headerFromName`, `subject`, `messageId`, `sentAt`, `authResults`
  (SPF/DKIM/DMARC from the `Authentication-Results` header), `status`, `receivedAt`; unique
  `rawKey` and `(tripId, messageId)`.
- `status` is `received` for now; later `ignored | queued | extracting | extracted | failed`.
  The phase 2b queue picks up `received` rows, and token usage and errors get columns then.
- `POST /api/inbound/email` — bearer shared secret (`INBOUND_EMAIL_SECRET`), Zod-validated
  notice; 404 for an unknown address (the Worker bounces it); `duplicate` when the same
  Message-ID is already stored for the trip under another key (the Worker deletes its copy); a
  repeat of the same key is `stored`, so Worker retries are safe.
- The app parses only the header block (postal-mime); the body is untouched until 2b.
- The Worker's logic (`workers/inbound-email/src/inbound.ts`) has no Workers-only APIs, so
  `pnpm inbound:send <file.eml> <trip-address>` runs the same steps locally, with `.inbound/`
  standing in for R2.
- A basic list of received emails (subject, sender, time) on the trip dashboard, plus the trip's
  forwarding address with a copy button.

**Deferred to 2b:** sender verification (needs phase 1 accounts), the job queue, body parsing,
a content hash for dedupe (forwarded copies of one booking differ byte-for-byte, so it has to
hash extracted text), reading raw mail back from R2 (needs an R2 API token in the app),
extraction.

## Extract (phase 2b)

Flights only for now; the pipeline is built so other kinds plug in. Code is in
`src/features/extraction/`.

**Extractors are the unit of modularity.** Each booking kind is one `Extractor`
(`extraction/types.ts`) listed in `extraction/registry.ts`. An extractor supplies:

- `mightContain(email)` — a cheap keyword check before any AI spend; errs towards yes
- `fromSchemaOrg(nodes)` — bookings from JSON-LD markup (flights: `FlightReservation`)
- `aiSchema` + `aiInstructions` — its part of the Claude request; the pipeline builds one
  structured-output schema from every candidate extractor (a discriminated union on `kind`),
  so one call extracts all kinds at once
- `fromAi(output)` — strict validation and normalisation of what Claude returned (IATA codes,
  real time zones, arrival after departure); bad items are dropped, not saved
- `save(tx, context)` — writes the shared `bookings` row (+ `booking_travellers`) and the kind's
  detail table (`flight_segments`)

Adding hotels means a `stay` extractor, a `stays` table and a line in the registry; the
pipeline, the job and the Claude call don't change.

**Data model:** `bookings` holds what every kind shares (trip, kind, provider, booking
reference, review status, source email, extraction path); each kind has a detail table.
Duplicates are matched on `(trip, kind, reference)`: three people forwarding the same
confirmation make one booking. Flight times are stored as the airport's wall-clock time + IANA
zone (shown as written) and as an instant (for ordering). schema.org markup gives offsets but
no zones, so those segments have a null zone.

**The job** (`extraction/job.ts`) starts from `src/instrumentation.ts` when
`ANTHROPIC_API_KEY` is set (and, in production, the R2 read credentials).

- Queue: `inbound_emails.status`. The job claims the oldest due row with
  `FOR UPDATE SKIP LOCKED`, setting `extracting` and a 5-minute lock, so a crashed run is picked
  up again and several instances can share the work.
- Wake-up: the endpoint sends `NOTIFY inbound_email` in the insert's transaction, so extraction
  starts within moments; a poll every minute catches anything missed during deploys and runs
  due retries.
- Outcomes: `extracted` (≥1 booking added or matched), `ignored` (nothing we handle), `failed`.
  Errors retry after 1, 5 and 30 minutes, then fail; refusals, bad requests and expired raw
  mail fail at once. The error, extraction path, model and token counts are kept on the row.
- Cost controls: the pre-filter, schema.org first, a cap of 50 Claude calls per trip per day
  (`EXTRACTION_DAILY_AI_CAP`; over it, emails wait an hour), text capped at 100k characters.
  Set a spend limit in the Anthropic Console too.

**Model:** `claude-haiku-5-5` by default (`EXTRACTION_MODEL` to change), at effort `medium`.
Chosen for cost before accuracy has been measured — check it with `pnpm extract` on real emails
(the phase 0 script) and switch if times or legs come out wrong.

**Not yet:** sender verification (needs accounts, phase 1), PDF attachments, reschedules and
cancellations updating a booking (phase 4), other kinds.

## Data model sketch

To be refined in phase 1/2:

- `trips` — name, slug, inbound address token, home currency
- `members` — trip, display name, optional user account
- `users` / `user_emails` — verified addresses (these decide who may forward)
- `inbound_emails` — trip, sender, message-id, content hash, storage key, status, token usage
  (first version in [Receive and store](#receive-and-store-phase-2a))
- `bookings` — trip, kind (flight / stay / train / event / car / other), provider, booking
  reference (sensitive), status (pending review / confirmed / cancelled), source email, plus a
  detail table per kind (built: `flight_segments`); still to come: amount (integer minor units
  - currency), payer member
- `booking_travellers` — booking ↔ member, with the name as written on the booking (built
  without the member link, which comes with phase 3)
- `documents` — attachments worth keeping (e-tickets, boarding passes), linked to a booking

## Extraction

1. **Filter before anything costs money:** each extractor's keyword check (built). Known
   booking senders and attachments could tighten it later.
2. **Dedupe:** message-id on arrival (built), booking reference after extraction (built). A
   content hash before extraction would save the second Claude call when three people forward
   the same email; forwarded copies differ byte-for-byte, so it has to hash the extracted text.
3. **schema.org first:** many airline, hotel and ticketing emails embed `FlightReservation`,
   `LodgingReservation`, `EventReservation` markup (what Gmail uses for trip cards). Free and
   exact.
4. **Claude fallback:** send cleaned text (and PDF attachments when needed) with a Zod-derived
   structured-output schema. The response can be "not a booking".
5. **Escalate only on failure:** if the result fails validation (no dates, unparseable times),
   retry that one email on a stronger model.

### Getting it right

- **Time zones:** flight times are local to each airport; arrivals can be the next day. Store
  instants plus the IANA zone of each location.
- **Date formats:** DD/MM vs MM/DD ambiguity — use the provider's locale and context.
- **Changes and cancellations:** "Your flight has been rescheduled" must update the existing
  booking, matched on booking reference + provider.
- **People matching:** "ROBERTSON/KIERAN MR" → a member, by fuzzy name match plus confirmation.
- **Review step:** extracted bookings appear as "check this" before joining the board; every field
  is editable.

### Cost

Estimates at October 2026 prices (re-check before relying on them), assuming ~5k input and
~1.5k output tokens per email after HTML stripping:

| Model      | Input / output per 1M tokens | Per 1,000 emails | Per trip (~20 emails) |
| ---------- | ---------------------------- | ---------------- | --------------------- |
| Haiku 5.5  | $0.10 / $0.50                | ~$1–3            | ~2–5¢                 |
| Sonnet 5.5 | $2 / $10                     | ~$25             | ~50¢                  |
| Opus 5.5   | $4 / $20                     | ~$50             | ~$1                   |

The model is chosen on **accuracy** measured in phase 0, not price. The levers that matter more
than model choice: stripping HTML (raw emails are 30–50k tokens; text is 3–5k), the schema.org
path, filtering, and dedupe. The Batch API (50% off) doesn't fit, because a forwarded email
should appear within a minute.

The real cost risk is abuse or a reprocessing bug, not normal use:

- process only senders who are verified members (others go to an approval queue)
- cap AI extractions per trip per day (e.g. 50)
- set spend limits and alerts in the Anthropic Console
- log token usage per inbound email so cost per trip is visible

## Privacy and security

- **The trip address is a secret.** Unguessable token, can be rotated by the organiser.
- **Sender verification:** accept mail only from members' verified addresses with passing
  SPF/DKIM; everything else waits for the organiser's approval.
- **Prompt injection:** email content is data. The extraction call has no tools and its output is
  validated against the schema; nothing in an email can trigger an action.
- **Show extracted fields only.** The group never sees the raw email. Booking references are
  hidden behind a tap and visible only to the travellers on that booking and the forwarder.
- **Data minimisation:** don't store passport numbers or payment card fragments at all; strip
  them before storage where possible.
- **Retention:** delete raw emails and unneeded attachments after a fixed period (e.g. 30 days);
  bookings themselves live as long as the trip.
- **GDPR:** we process personal data of everyone named on a booking, not just the forwarder.
  Needs a privacy policy, a lawful basis, deletion on request, and data-processing terms with
  every provider in the pipeline (email, storage, AI).
