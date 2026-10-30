CREATE TABLE "booking_travellers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"booking_id" uuid NOT NULL,
	"position" integer NOT NULL,
	"name_as_written" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "bookings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"trip_id" uuid NOT NULL,
	"kind" text NOT NULL,
	"status" text DEFAULT 'pending_review' NOT NULL,
	"provider" text,
	"reference" text,
	"source_email_id" uuid,
	"extraction_path" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "bookings_tripId_kind_reference_unique" UNIQUE("trip_id","kind","reference")
);
--> statement-breakpoint
CREATE TABLE "flight_segments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"booking_id" uuid NOT NULL,
	"position" integer NOT NULL,
	"airline" text,
	"flight_number" text NOT NULL,
	"departure_airport" text NOT NULL,
	"departure_local" timestamp NOT NULL,
	"departure_time_zone" text,
	"departure_at" timestamp with time zone NOT NULL,
	"arrival_airport" text NOT NULL,
	"arrival_local" timestamp NOT NULL,
	"arrival_time_zone" text,
	"arrival_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
ALTER TABLE "inbound_emails" ADD COLUMN "attempts" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "inbound_emails" ADD COLUMN "retry_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "inbound_emails" ADD COLUMN "locked_until" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "inbound_emails" ADD COLUMN "processed_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "inbound_emails" ADD COLUMN "extraction_path" text;--> statement-breakpoint
ALTER TABLE "inbound_emails" ADD COLUMN "model" text;--> statement-breakpoint
ALTER TABLE "inbound_emails" ADD COLUMN "input_tokens" integer;--> statement-breakpoint
ALTER TABLE "inbound_emails" ADD COLUMN "output_tokens" integer;--> statement-breakpoint
ALTER TABLE "inbound_emails" ADD COLUMN "error" text;--> statement-breakpoint
ALTER TABLE "booking_travellers" ADD CONSTRAINT "booking_travellers_booking_id_bookings_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_trip_id_trips_id_fk" FOREIGN KEY ("trip_id") REFERENCES "public"."trips"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_source_email_id_inbound_emails_id_fk" FOREIGN KEY ("source_email_id") REFERENCES "public"."inbound_emails"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "flight_segments" ADD CONSTRAINT "flight_segments_booking_id_bookings_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "booking_travellers_booking_id_index" ON "booking_travellers" USING btree ("booking_id");--> statement-breakpoint
CREATE INDEX "bookings_trip_id_index" ON "bookings" USING btree ("trip_id");--> statement-breakpoint
CREATE INDEX "flight_segments_booking_id_index" ON "flight_segments" USING btree ("booking_id");--> statement-breakpoint
CREATE INDEX "inbound_emails_pending_index" ON "inbound_emails" USING btree ("received_at") WHERE "inbound_emails"."status" in ('received', 'extracting');