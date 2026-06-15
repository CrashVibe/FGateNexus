import { sql } from "drizzle-orm";
import { index, integer, real, sqliteTable } from "drizzle-orm/sqlite-core";

import { serverTable } from "./server-table";

/** tps / mspt 为 Paper 专有，缺失为 null */
export const serverStatusHistoryTable = sqliteTable(
  "server_status_history",
  {
    createdAt: integer("created_at", { mode: "timestamp" })
      .notNull()
      .default(sql`(unixepoch())`),
    id: integer("id").primaryKey({ autoIncrement: true }),
    mspt: real("mspt"),
    online: integer("online").notNull(),
    serverId: integer("server_id")
      .references(() => serverTable.id, { onDelete: "cascade" })
      .notNull(),
    tps: real("tps"),
  },
  (t) => [index("idx_status_history_server_time").on(t.serverId, t.createdAt)],
);
