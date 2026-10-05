CREATE TABLE "device_users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"device_id" text NOT NULL,
	"user_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "device_users_device_user_unique" UNIQUE("device_id","user_id")
);
--> statement-breakpoint
CREATE INDEX "device_users_device_idx" ON "device_users" ("device_id");--> statement-breakpoint
CREATE INDEX "device_users_user_idx" ON "device_users" ("user_id");--> statement-breakpoint
ALTER TABLE "device_users" ADD CONSTRAINT "device_users_user_id_users_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE;