import { sql } from "drizzle-orm";
import {
  index,
  integer,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";
import { v4 as uuidv4 } from "uuid";
import type { TargetConfig } from "~~/shared/schemas/server/target";

import { servers } from "./servers";

export const targets = sqliteTable(
  "targets",
  {
    config: text("config", { mode: "json" }).notNull().$type<TargetConfig>(),
    createdAt: integer("created_at", { mode: "timestamp" })
      .notNull()
      .default(sql`(unixepoch())`),

    enabled: integer("enabled", { mode: "boolean" }).notNull().default(true),
    id: text("id")
      .primaryKey()
      // UUID
      .$defaultFn(() => uuidv4()),
    serverId: integer("server_id")
      .notNull()
      .references(() => servers.id, { onDelete: "cascade" }),
    targetId: text("target_id").notNull(),
    type: text("type", { enum: ["group", "private"] })
      .notNull()
      .default("group"),
    updatedAt: integer("updated_at", { mode: "timestamp" })
      .notNull()
      .default(sql`(unixepoch())`),
  },
  (t) => [
    uniqueIndex("uniq_target_in_server").on(t.serverId, t.targetId, t.type),
    index("idx_targets_server").on(t.serverId),
    index("idx_targets_group").on(t.targetId),
  ],
);
