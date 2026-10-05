ALTER TABLE "events" ADD COLUMN "user_id" uuid;--> statement-breakpoint
CREATE INDEX "events_user_time_idx" ON "events" ("user_id","occurred_at");--> statement-breakpoint
ALTER TABLE "events" ADD CONSTRAINT "events_user_id_users_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id");