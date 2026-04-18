import { sql } from "drizzle-orm";
import {
  index,
  integer,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";

import { AdapterType } from "#shared/model/adapter";

export const socialAccounts = sqliteTable(
  "social_accounts",
  {
    adapterType: text("adapter_type", { enum: [AdapterType.Onebot] }).notNull(),
    createdAt: integer("created_at", { mode: "timestamp" })
      .notNull()
      .default(sql`(unixepoch())`),
    id: integer("id").primaryKey({ autoIncrement: true }),
    nickname: text("nickname"),
    uid: text("uid").notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp" })
      .notNull()
      .default(sql`(unixepoch())`),
  },
  (t) => [
    uniqueIndex("uniq_social_uid_per_adapter").on(t.adapterType, t.uid),
    index("idx_social_adapter").on(t.adapterType),
  ],
);
