# Email ingestion — design notes

Technical notes for the forwarding pipeline behind the trip board. These are the starting point
for scoping, not a final spec — confirm or revise them in the phase that builds each part (see
[roadmap.md](./roadmap.md)).

## Pipeline

```
member forwards → <trip-address>@in.celtivo.com
  → Cloudflare Email Routing (catch-all on the in.celtivo.com subdomain) → Email Worker
  → POST /api/inbound/email        verify the shared secret, store the raw message,
                                    enqueue a job, return 200 immediately
  → worker container (Dokploy)     1. sender check (known member? SPF/DKIM pass?)
                                    2. is this a booking? (rules first)
                                    3. schema.org JSON-LD/microdata → structured booking
                                    4. otherwise HTML → text, then Claude extraction
                                       with structured output, validated by a Zod schema
                                    5. match to existing bookings (dedupe / update / cancel)
  → Postgres (Drizzle)             bookings awaiting review → trip board
```

- **Subdomain:** `in.celtivo.com` gets its own MX records so normal celtivo.com mail is never
  affected.
- **Why a worker:** extraction takes seconds; the inbound webhook must answer immediately. A
  Postgres-backed job queue (pg-boss or graphile-worker) avoids adding Redis. The worker is a
  second service in Dokploy built from the same repo.
- **Raw storage:** raw `.eml` files and attachments go to object storage (Cloudflare R2), not
  Postgres, and are deleted after a retention period.
- **Alternative inbound provider:** Postmark Inbound delivers already-parsed JSON (simpler, paid).
  Cloudflare Email Workers are free and already in our stack, but we parse MIME ourselves
  (e.g. `postal-mime`). Decide in phase 2.

## Data model sketch

To be refined in phase 1/2:

- `trips` — name, slug, inbound address token, home currency
- `members` — trip, display name, optional user account
- `users` / `user_emails` — verified addresses (these decide who may forward)
- `inbound_emails` — trip, sender, message-id, content hash, storage key, status, token usage
- `bookings` — trip, kind (flight / stay / train / event / car / other), provider, booking
  reference (sensitive), start/end as timestamps **with time zone**, location, amount
  (integer minor units + currency), payer member, status (pending review / confirmed /
  cancelled), source email
- `booking_travellers` — booking ↔ member, with the name as written on the booking
- `documents` — attachments worth keeping (e-tickets, boarding passes), linked to a booking

## Extraction

1. **Filter before anything costs money:** known booking senders, subject keywords
   ("confirmation", "itinerary", "e-ticket"), attachments. Newsletters and reply chains stop here.
2. **Dedupe before extraction:** message-id and a content hash. Three people forwarding the same
   Airbnb email costs one extraction.
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
