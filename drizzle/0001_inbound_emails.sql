CREATE TABLE "inbound_emails" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"trip_id" uuid NOT NULL,
	"raw_key" text NOT NULL,
	"raw_size" integer NOT NULL,
	"envelope_from" text NOT NULL,
	"envelope_to" text NOT NULL,
	"header_from" text,
	"header_from_name" text,
	"subject" text,
	"message_id" text,
	"sent_at" timestamp with time zone,
	"auth_results" text,
	"status" text DEFAULT 'received' NOT NULL,
	"received_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "inbound_emails_rawKey_unique" UNIQUE("raw_key"),
	CONSTRAINT "inbound_emails_tripId_messageId_unique" UNIQUE("trip_id","message_id")
);
--> statement-breakpoint
ALTER TABLE "trips" ADD COLUMN "inbound_token" text;--> statement-breakpoint
-- Hand-edited: give existing trips a token before NOT NULL applies. Eight hex characters from
-- a UUID, which fit the app's [a-z0-9]{8} token pattern; new trips get tokens from the app.
UPDATE "trips" SET "inbound_token" = substr(replace(gen_random_uuid()::text, '-', ''), 1, 8);--> statement-breakpoint
ALTER TABLE "trips" ALTER COLUMN "inbound_token" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "inbound_emails" ADD CONSTRAINT "inbound_emails_trip_id_trips_id_fk" FOREIGN KEY ("trip_id") REFERENCES "public"."trips"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "inbound_emails_trip_id_received_at_index" ON "inbound_emails" USING btree ("trip_id","received_at");--> statement-breakpoint
ALTER TABLE "trips" ADD CONSTRAINT "trips_inboundToken_unique" UNIQUE("inbound_token");