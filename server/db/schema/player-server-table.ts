import { sql } from "drizzle-orm";
import {
  index,
  integer,
  primaryKey,
  sqliteTable,
} from "drizzle-orm/sqlite-core";

import { playerTable } from "./player-table";
import { serverTable } from "./server-table";

export const playerServerTable = sqliteTable(
  "player_server",
  {
    createdAt: integer("created_at", { mode: "timestamp" })
      .notNull()
      .default(sql`(unixepoch())`),
    playerId: integer("player_id")
      .references(() => playerTable.id, { onDelete: "cascade" })
      .notNull(),
    serverId: integer("server_id")
      .references(() => serverTable.id, { onDelete: "cascade" })
      .notNull(),
  },
  (t) => [
    primaryKey({
      columns: [t.playerId, t.serverId],
      name: "pk_player_server",
    }),
    index("idx_player_server_player").on(t.playerId),
    index("idx_player_server_server").on(t.serverId),
  ],
);
