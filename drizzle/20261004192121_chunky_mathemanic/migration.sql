ALTER TABLE "products" ADD COLUMN "description" text NOT NULL;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "category" text NOT NULL;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "original_price_minor" bigint NOT NULL;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "rating" bigint NOT NULL;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "rating_count" bigint NOT NULL;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "stock" bigint NOT NULL;--> statement-breakpoint
ALTER TABLE "products" DROP COLUMN "currency";--> statement-breakpoint
ALTER TABLE "products" ALTER COLUMN "image_url" SET NOT NULL;