import { relations, sql } from "drizzle-orm";
import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
import type { AdapterConfig } from "~~/shared/schemas/adapter";
import { AdapterType } from "~~/shared/schemas/adapter";
import type { BindingConfig } from "~~/shared/schemas/server/binding";
import type { ChatSyncConfig } from "~~/shared/schemas/server/chatSync";
import type { CommandConfig } from "~~/shared/schemas/server/command";

export const adapters = sqliteTable("adapters", {
    id: integer("id").primaryKey({ autoIncrement: true }),
    type: text("type", {
        enum: [AdapterType.Onebot]
    }).notNull(),
    enabled: integer("enabled", { mode: "boolean" }).notNull().default(true),
    config: text("config", { mode: "json" }).notNull().$type<AdapterConfig>()
});

export const servers = sqliteTable("servers", {
    id: integer("id").primaryKey({ autoIncrement: true }),
    name: text("name").notNull().unique("name_idx"),
    token: text("token").notNull().unique("token_idx"),
    minecraft_version: text("software"),
    minecraft_software: text("version"),
    adapterId: integer("adapter_id").references(() => adapters.id, { onDelete: "set null" }),
    bindingConfig: text("binding_config", { mode: "json" }).notNull().$type<BindingConfig>(),
    chatSyncConfig: text("chat_sync_config", { mode: "json" }).notNull().$type<ChatSyncConfig>(),
    commandConfig: text("command_config", { mode: "json" }).notNull().$type<CommandConfig>()
});

export const socialAccounts = sqliteTable("social_accounts", {
    id: integer("id").primaryKey({ autoIncrement: true }),
    nickname: text("nickname"),
    uid: text("uid").notNull().unique("uid_idx"),
    adapterType: text("adapter_type", {
        enum: [AdapterType.Onebot]
    }).notNull(),
    createdAt: integer("created_at", { mode: "timestamp" })
        .notNull()
        .default(sql`(unixepoch())`),
    updatedAt: integer("updated_at", { mode: "timestamp" })
        .notNull()
        .default(sql`(unixepoch())`)
});

export const players = sqliteTable("players", {
    id: integer("id").primaryKey({ autoIncrement: true }),
    uuid: text("uuid").notNull().unique("uuid_idx"),
    name: text("name").notNull(),
    ip: text("ip"),
    socialAccountId: integer("social_account_id").references(() => socialAccounts.id, { onDelete: "set null" }),
    createdAt: integer("created_at", { mode: "timestamp" })
        .notNull()
        .default(sql`(unixepoch())`),
    updatedAt: integer("updated_at", { mode: "timestamp" })
        .notNull()
        .default(sql`(unixepoch())`)
});

export const playerServers = sqliteTable("player_servers", {
    id: integer("id").primaryKey({ autoIncrement: true }),
    playerId: integer("player_id")
        .references(() => players.id, { onDelete: "cascade" })
        .notNull(),
    serverId: integer("server_id")
        .references(() => servers.id, { onDelete: "cascade" })
        .notNull()
});

export const adaptersRelations = relations(adapters, ({ many }) => ({
    servers: many(servers)
}));

export const serversRelations = relations(servers, ({ one, many }) => ({
    adapter: one(adapters, {
        fields: [servers.adapterId],
        references: [adapters.id]
    }),
    playerServers: many(playerServers)
}));

export const socialAccountsRelations = relations(socialAccounts, ({ many }) => ({
    players: many(players)
}));

export const playersRelations = relations(players, ({ one, many }) => ({
    socialAccount: one(socialAccounts, {
        fields: [players.socialAccountId],
        references: [socialAccounts.id]
    }),
    playerServers: many(playerServers)
}));

export const playerServersRelations = relations(playerServers, ({ one }) => ({
    player: one(players, {
        fields: [playerServers.playerId],
        references: [players.id]
    }),
    server: one(servers, {
        fields: [playerServers.serverId],
        references: [servers.id]
    })
}));
