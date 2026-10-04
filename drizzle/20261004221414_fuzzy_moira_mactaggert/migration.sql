CREATE TABLE "users" (
	"_id" serial PRIMARY KEY,
	"id" uuid DEFAULT gen_random_uuid() NOT NULL UNIQUE,
	"name" varchar(256) NOT NULL,
	"email" text NOT NULL UNIQUE,
	"password" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "refresh_tokens" (
	"_id" serial PRIMARY KEY,
	"id" uuid DEFAULT gen_random_uuid() NOT NULL UNIQUE,
	"user_id" uuid NOT NULL,
	"token_hash" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"revoked" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "users_email_idx" ON "users" ("email");--> statement-breakpoint
CREATE INDEX "refresh_tokens_user_id_idx" ON "refresh_tokens" ("user_id");--> statement-breakpoint
CREATE INDEX "refresh_tokens_token_hash_idx" ON "refresh_tokens" ("token_hash");--> statement-breakpoint
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_user_id_users_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE;