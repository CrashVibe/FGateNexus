import { sql } from "drizzle-orm";
import {
  index,
  integer,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";
import { v4 as uuidv4 } from "uuid";
import type { TargetConfig } from "~~/shared/model/server/schema/target";

import { platformTypeValues } from "./bot-table";
import { serverTable } from "./server-table";

export const targetTable = sqliteTable(
  "target",
  {
    channelId: text("channel_id").notNull(),
    config: text("config", { mode: "json" }).notNull().$type<TargetConfig>(),
    createdAt: integer("created_at", { mode: "timestamp" })
      .notNull()
      .default(sql`(unixepoch())`),
    guildId: text("guild_id"),
    id: text("id")
      .primaryKey()
      // UUID
      .$defaultFn(() => uuidv4()),
    platform: text("platform", { enum: platformTypeValues }).notNull(),
    serverId: integer("server_id")
      .notNull()
      .references(() => serverTable.id, { onDelete: "cascade" }),
    type: text("type", { enum: ["group", "private"] })
      .notNull()
      .default("group"),
    updatedAt: integer("updated_at", { mode: "timestamp" })
      .notNull()
      .default(sql`(unixepoch())`),
  },
  (t) => [
    uniqueIndex("uniq_target_in_server").on(t.serverId, t.channelId, t.type),
    index("idx_target_server").on(t.serverId),
    index("idx_target_group").on(t.channelId),
  ],
);

export type Target = typeof targetTable.$inferSelect;
