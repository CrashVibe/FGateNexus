import { sql } from "drizzle-orm";
import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

import { serverTable } from "./server-table";

export const playerEventTable = sqliteTable(
  "player_event",
  {
    createdAt: integer("created_at", { mode: "timestamp" })
      .notNull()
      .default(sql`(unixepoch())`),
    data: text("data", { mode: "json" }).$type<Record<string, unknown>>(),
    id: integer("id").primaryKey({ autoIncrement: true }),
    playerName: text("player_name"),
    playerUuid: text("player_uuid"),
    serverId: integer("server_id")
      .references(() => serverTable.id, { onDelete: "cascade" })
      .notNull(),
    type: text("type").notNull(),
  },
  (t) => [
    // 排行榜聚合
    index("idx_event_server_type_time").on(t.serverId, t.type, t.createdAt),
    // 玩家时间线
    index("idx_event_server_player_time").on(
      t.serverId,
      t.playerUuid,
      t.createdAt,
    ),
  ],
);
