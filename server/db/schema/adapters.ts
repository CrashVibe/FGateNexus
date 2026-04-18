import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

import type { AdapterConfig } from "#shared/model/adapter";
import { AdapterType } from "#shared/model/adapter";

export const adapters = sqliteTable("adapters", {
  config: text("config", { mode: "json" }).notNull().$type<AdapterConfig>(),
  enabled: integer("enabled", { mode: "boolean" }).notNull().default(true),
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull().default(""),
  type: text("type", {
    enum: [AdapterType.Onebot],
  }).notNull(),
});
