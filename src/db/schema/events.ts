import {
  pgTable,
  uuid,
  text,
  jsonb,
  timestamp,
  index,
} from "drizzle-orm/pg-core";

import { products } from "./products";

export const events = pgTable(
  "events",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    eventName: text("event_name").notNull(),

    deviceId: text("device_id").notNull(),

    sessionId: text("session_id").notNull(),

    productId: uuid("product_id").references(() => products.id),

    properties: jsonb("properties")
      .$type<Record<string, unknown>>()
      .notNull()
      .default({}),

    occurredAt: timestamp("occurred_at", {
      withTimezone: true,
    })
      .notNull()
      .defaultNow(),

    createdAt: timestamp("created_at", {
      withTimezone: true,
    })
      .notNull()
      .defaultNow(),
  },

  (table) => [
    index("events_event_name_time_idx").on(
      table.eventName,
      table.occurredAt,
    ),

    index("events_product_time_idx").on(
      table.productId,
      table.occurredAt,
    ),

    index("events_device_time_idx").on(
      table.deviceId,
      table.occurredAt,
    ),

    index("events_session_time_idx").on(
      table.sessionId,
      table.occurredAt,
    ),
  ],
);