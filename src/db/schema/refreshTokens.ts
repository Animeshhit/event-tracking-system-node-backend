import { boolean, index, pgTable, serial, text, timestamp, uuid } from "drizzle-orm/pg-core";
import {users} from "./users";

export const refreshTokens = pgTable(
  "refresh_tokens",
  {
    _id: serial("_id").primaryKey(),
    id: uuid("id").defaultRandom().notNull().unique(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    tokenHash: text("token_hash").notNull(), 
    expiresAt: timestamp("expires_at").notNull(),
    revoked: boolean("revoked").default(false).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("refresh_tokens_user_id_idx").on(table.userId),
    index("refresh_tokens_token_hash_idx").on(table.tokenHash),
  ]
);
