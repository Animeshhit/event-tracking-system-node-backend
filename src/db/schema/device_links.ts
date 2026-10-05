import {
  pgTable,
  uuid,
  text,
  timestamp,
  unique,
  index,
} from "drizzle-orm/pg-core";

import { users } from "./users";

export const deviceUsers = pgTable(
  "device_users",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    deviceId: text("device_id").notNull(),

    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, {
        onDelete: "cascade",
      }),

    createdAt: timestamp("created_at", {
      withTimezone: true,
    })
      .notNull()
      .defaultNow(),
  },

  (table) => [
    unique("device_users_device_user_unique").on(
      table.deviceId,
      table.userId,
    ),

    index("device_users_device_idx").on(table.deviceId),

    index("device_users_user_idx").on(table.userId),
  ],
);