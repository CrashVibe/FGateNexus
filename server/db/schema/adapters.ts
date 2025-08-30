import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
import type { AdapterConfig } from "~~/shared/schemas/adapter";
import { AdapterType } from "~~/shared/schemas/adapter";

export const adapters = sqliteTable("adapters", {
    id: integer("id").primaryKey({ autoIncrement: true }),
    name: text("name").notNull().default(""),
    type: text("type", {
        enum: [AdapterType.Onebot]
    }).notNull(),
    enabled: integer("enabled", { mode: "boolean" }).notNull().default(true),
    config: text("config", { mode: "json" }).notNull().$type<AdapterConfig>()
});
