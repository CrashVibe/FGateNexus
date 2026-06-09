import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

import { PlatformType } from "#shared/model/bot/types";
import type { PlatformConfig } from "#shared/model/bot/types";

export const platformTypeValues = Object.values(PlatformType) as [
  PlatformType,
  ...PlatformType[],
];

export const botTable = sqliteTable("bot", {
  config: text("config", { mode: "json" }).notNull().$type<PlatformConfig>(),
  enabled: integer("enabled", { mode: "boolean" }).notNull().default(true),
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull().default(""),
  platform: text("platform", {
    enum: platformTypeValues,
  }).notNull(),
});
