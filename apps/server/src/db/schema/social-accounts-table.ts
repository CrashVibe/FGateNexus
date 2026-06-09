import { sql } from "drizzle-orm";
import {
  index,
  integer,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";

import { platformTypeValues } from "./bot-table";

export const socialAccountTable = sqliteTable(
  "social_account",
  {
    createdAt: integer("created_at", { mode: "timestamp" })
      .notNull()
      .default(sql`(unixepoch())`),
    id: integer("id").primaryKey({ autoIncrement: true }),
    nickname: text("nickname"),
    platform: text("platform", {
      enum: platformTypeValues,
    }).notNull(),
    uid: text("uid").notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp" })
      .notNull()
      .default(sql`(unixepoch())`),
  },
  (t) => [
    uniqueIndex("uniq_social_uid_per_platform").on(t.platform, t.uid),
    index("idx_social_platform").on(t.platform),
  ],
);
