import { relations } from "drizzle-orm";

import { botTable } from "./bot-table";
import { playerServerTable } from "./player-server-table";
import { playerTable } from "./player-table";
import { serverTable } from "./server-table";
import { socialAccountTable } from "./social-accounts-table";
import { targetTable } from "./target-table";

export const botRelations = relations(botTable, ({ many }) => ({
  servers: many(serverTable),
}));

export const serversRelations = relations(serverTable, ({ one, many }) => ({
  bot: one(botTable, {
    fields: [serverTable.botId],
    references: [botTable.id],
  }),
  playerServers: many(playerServerTable),
  targets: many(targetTable),
}));

export const targetRelation = relations(targetTable, ({ one }) => ({
  server: one(serverTable, {
    fields: [targetTable.serverId],
    references: [serverTable.id],
  }),
}));

export const socialAccountRelation = relations(
  socialAccountTable,
  ({ many }) => ({
    players: many(playerTable),
  }),
);

export const playerRelation = relations(playerTable, ({ one, many }) => ({
  playerServers: many(playerServerTable),
  socialAccount: one(socialAccountTable, {
    fields: [playerTable.socialAccountId],
    references: [socialAccountTable.id],
  }),
}));

export const playerServerRelation = relations(playerServerTable, ({ one }) => ({
  player: one(playerTable, {
    fields: [playerServerTable.playerId],
    references: [playerTable.id],
  }),
  server: one(serverTable, {
    fields: [playerServerTable.serverId],
    references: [serverTable.id],
  }),
}));
