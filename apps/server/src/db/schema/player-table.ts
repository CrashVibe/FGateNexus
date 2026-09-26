import { sql } from "drizzle-orm";
import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

import { socialAccountTable } from "./social-accounts-table";

export const playerTable = sqliteTable(
  "player",
  {
    createdAt: integer("created_at", { mode: "timestamp" })
      .notNull()
      .default(sql`(unixepoch())`),
    id: integer("id").primaryKey({ autoIncrement: true }),
    ip: text("ip"),
    name: text("name").notNull(),
    socialAccountId: integer("social_account_id").references(
      () => socialAccountTable.id,
      { onDelete: "set null" },
    ),
    updatedAt: integer("updated_at", { mode: "timestamp" })
      .notNull()
      .default(sql`(unixepoch())`),
    uuid: text("uuid").notNull().unique("uuid_idx"),
  },
  (t) => [index("idx_player_social").on(t.socialAccountId)],
);
