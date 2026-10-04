
import {bigint, char, pgTable,text,timestamp,uuid,} from "drizzle-orm/pg-core";

export const products = pgTable("products",{
    id:uuid("id").defaultRandom().primaryKey(),
    name:text("name").notNull(),
    priceMinor:bigint("price_minor",{
        mode:"number",
    }).notNull(),
    currency: char("currency", {
    length: 3,
  })
    .notNull()
    .default("INR"),

  imageUrl: text("image_url"),

  createdAt: timestamp("created_at", {
    withTimezone: true,
  })
    .notNull()
    .defaultNow(),
})