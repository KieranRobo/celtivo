import type { InboundEmail } from "../schema";

const receivedTime = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "Europe/London",
});

/** Emails forwarded to the trip, newest first. A plain list until extraction exists. */
export function InboundEmailList({ emails }: { emails: InboundEmail[] }) {
  return (
    <section aria-labelledby="forwarded-emails" className="mt-10">
      <h2
        id="forwarded-emails"
        className="m-0 mb-3 text-[11px] font-normal tracking-[0.1em] text-accent-700 uppercase"
      >
        Forwarded emails
      </h2>
      {emails.length === 0 ? (
        <p className="m-0 rounded-control border border-dashed border-neutral-300 px-4 py-5 text-[14px] text-neutral-600">
          Nothing yet. Forward a booking confirmation to the trip&apos;s address and it shows up
          here.
        </p>
      ) : (
        <ul className="m-0 list-none overflow-hidden rounded-control border border-neutral-300 p-0">
          {emails.map((email) => (
            <li
              key={email.id}
              className="flex flex-col gap-0.5 border-b border-neutral-300 px-4 py-3 last:border-b-0 sm:flex-row sm:items-baseline sm:gap-4"
            >
              <div className="min-w-0 flex-1">
                <p className="m-0 truncate text-[15px] text-neutral-900">
                  {email.subject ?? "(no subject)"}
                </p>
                <p className="m-0 truncate text-[13px] text-neutral-600">
                  {email.fromName ? `${email.fromName} · ${email.fromAddress}` : email.fromAddress}
                </p>
              </div>
              <time
                dateTime={email.receivedAt}
                className="shrink-0 text-xs text-neutral-600 tabular-nums"
              >
                {receivedTime.format(new Date(email.receivedAt))}
              </time>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
