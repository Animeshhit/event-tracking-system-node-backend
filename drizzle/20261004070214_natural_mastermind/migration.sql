CREATE TABLE "products" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"name" text NOT NULL,
	"price_minor" bigint NOT NULL,
	"currency" char(3) DEFAULT 'INR' NOT NULL,
	"image_url" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"event_name" text NOT NULL,
	"product_id" uuid,
	"properties" jsonb DEFAULT '{}' NOT NULL,
	"occurred_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
DROP TABLE "users";--> statement-breakpoint
CREATE INDEX "events_event_name_time_idx" ON "events" ("event_name","occurred_at");--> statement-breakpoint
CREATE INDEX "events_product_time_idx" ON "events" ("product_id","occurred_at");--> statement-breakpoint
ALTER TABLE "events" ADD CONSTRAINT "events_product_id_products_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id");