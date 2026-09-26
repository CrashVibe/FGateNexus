import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

import { BindingConfigSchema } from "#shared/model/server/schema/binding";
import { ChatSyncConfigSchema } from "#shared/model/server/schema/chat-sync";
import { CommandConfigSchema } from "#shared/model/server/schema/command";
import { NotifyConfigSchema } from "#shared/model/server/schema/notify";

import { botTable } from "./bot-table";
import { zodJson } from "./zod-json";

export const serverTable = sqliteTable("server", {
  bindingConfig: zodJson("binding_config", BindingConfigSchema).notNull(),
  botId: integer("bot_id").references(() => botTable.id, {
    onDelete: "set null",
  }),
  chatSyncConfig: zodJson("chat_sync_config", ChatSyncConfigSchema).notNull(),
  commandConfig: zodJson("command_config", CommandConfigSchema).notNull(),
  id: integer("id").primaryKey({ autoIncrement: true }),
  minecraft_software: text("software"),
  minecraft_version: text("version"),
  name: text("name").notNull().unique("name_idx"),
  notifyConfig: zodJson("notify_config", NotifyConfigSchema).notNull(),
  token: text("token").notNull().unique("token_idx"),
});
