import { relations } from "drizzle-orm/relations";
import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import type { AdapterConfig } from "~~/shared/schemas/adapters";
import { AdapterType } from "~~/shared/schemas/adapters";

export const adapters = sqliteTable("adapters", {
    id: integer("id").primaryKey({ autoIncrement: true }),
    type: text("type", {
        enum: [AdapterType.Onebot]
    }).notNull(),
    config: text("config", { mode: "json" }).notNull().$type<AdapterConfig>()
});

export const servers = sqliteTable("servers", {
    id: integer("id").primaryKey({ autoIncrement: true }),
    name: text("name").notNull().unique("name_idx"),
    token: text("token").notNull().unique("token_idx"),
    minecraft_version: text("software"),
    minecraft_software: text("version"),
    adapterId: integer("adapter_id").references(() => adapters.id, { onDelete: "set null" })
});

export const adaptersRelations = relations(adapters, ({ many }) => ({
    servers: many(servers)
}));

export const serversRelations = relations(servers, ({ one }) => ({
    adapter: one(adapters, {
        fields: [servers.adapterId],
        references: [adapters.id]
    })
}));
