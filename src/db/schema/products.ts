import {
  bigint,
  char,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

export const products = pgTable("products", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  category: text("category").notNull(),
  originalPriceMinor: bigint("original_price_minor", {
    mode: "number",
  }).notNull(),
  priceMinor: bigint("price_minor", {
    mode: "number",
  }).notNull(),

  rating: bigint("rating", {
    mode: "number",
  }).notNull(),
  ratingCount: bigint("rating_count", {
    mode: "number",
  }).notNull(),
  stock: bigint("stock", {
    mode: "number",
  }).notNull(),
  image: text("image_url").notNull(),

  createdAt: timestamp("created_at", {
    withTimezone: true,
  })
    .notNull()
    .defaultNow(),
});
