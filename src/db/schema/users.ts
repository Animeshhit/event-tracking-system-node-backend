import { index, pgTable, serial, text, uuid, varchar } from "drizzle-orm/pg-core";

export const users = pgTable(
  "users",
  {
    _id: serial("_id").primaryKey(),
    id: uuid("id").defaultRandom().notNull().unique(),
    name: varchar("name", { length: 256 }).notNull(),
    email: text("email").notNull().unique(),
    password: text("password").notNull(),
  },
  (table) => [
    index("users_email_idx").on(table.email),
  ]
);