import { relations } from "drizzle-orm";
import { targets } from "./targets";
import { adapters } from "./adapters";
import { players } from "./players";
import { playerServers } from "./playerServers";
import { servers } from "./servers";
import { socialAccounts } from "./socialAccounts";

export const adaptersRelations = relations(adapters, ({ many }) => ({
    servers: many(servers)
}));

export const serversRelations = relations(servers, ({ one, many }) => ({
    adapter: one(adapters, {
        fields: [servers.adapterId],
        references: [adapters.id]
    }),
    playerServers: many(playerServers),
    targets: many(targets)
}));

export const targetsRelations = relations(targets, ({ one }) => ({
    server: one(servers, {
        fields: [targets.serverId],
        references: [servers.id]
    })
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
