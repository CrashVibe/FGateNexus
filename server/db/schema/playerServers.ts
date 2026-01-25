import { sql } from "drizzle-orm";
import { index, integer, primaryKey, sqliteTable } from "drizzle-orm/sqlite-core";

import { players } from "./players";
import { servers } from "./servers";

export const playerServers = sqliteTable(
  "player_servers",
  {
    playerId: integer("player_id")
      .references(() => players.id, { onDelete: "cascade" })
      .notNull(),
    serverId: integer("server_id")
      .references(() => servers.id, { onDelete: "cascade" })
      .notNull(),
    createdAt: integer("created_at", { mode: "timestamp" })
      .notNull()
      .default(sql`(unixepoch())`)
  },
  (t) => [
    primaryKey({ columns: [t.playerId, t.serverId], name: "pk_player_servers" }),
    index("idx_player_servers_player").on(t.playerId),
    index("idx_player_servers_server").on(t.serverId)
  ]
);
