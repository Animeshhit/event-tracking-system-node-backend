ALTER TABLE "events" ADD COLUMN "device_id" text NOT NULL;--> statement-breakpoint
ALTER TABLE "events" ADD COLUMN "session_id" text NOT NULL;--> statement-breakpoint
CREATE INDEX "events_device_time_idx" ON "events" ("device_id","occurred_at");--> statement-breakpoint
CREATE INDEX "events_session_time_idx" ON "events" ("session_id","occurred_at");