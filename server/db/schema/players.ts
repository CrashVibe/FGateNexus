import { sql } from "drizzle-orm";
import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

import { socialAccounts } from "./social-accounts";

export const players = sqliteTable("players", {
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
  id: integer("id").primaryKey({ autoIncrement: true }),
  ip: text("ip"),
  name: text("name").notNull(),
  socialAccountId: integer("social_account_id").references(
    () => socialAccounts.id,
    { onDelete: "set null" },
  ),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
  uuid: text("uuid").notNull().unique("uuid_idx"),
});
