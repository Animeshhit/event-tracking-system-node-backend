ALTER TABLE "events" ADD COLUMN "event_id" uuid NOT NULL;--> statement-breakpoint
ALTER TABLE "events" ADD CONSTRAINT "events_event_id_key" UNIQUE("event_id");