import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
import type { z } from "zod";

import type { BindingConfig } from "#shared/model/server/schema/binding";
import type { ChatSyncConfig } from "#shared/model/server/schema/chat-sync";
import type { CommandConfig } from "#shared/model/server/schema/command";
import type { NotifyConfigSchema } from "#shared/model/server/schema/notify";

import { botTable } from "./bot-table";

export const serverTable = sqliteTable("server", {
  bindingConfig: text("binding_config", { mode: "json" })
    .notNull()
    .$type<BindingConfig>(),
  botId: integer("bot_id").references(() => botTable.id, {
    onDelete: "set null",
  }),
  chatSyncConfig: text("chat_sync_config", { mode: "json" })
    .notNull()
    .$type<ChatSyncConfig>(),
  commandConfig: text("command_config", { mode: "json" })
    .notNull()
    .$type<CommandConfig>(),
  id: integer("id").primaryKey({ autoIncrement: true }),
  minecraft_software: text("software"),
  minecraft_version: text("version"),
  name: text("name").notNull().unique("name_idx"),
  notifyConfig: text("notify_config", {
    mode: "json",
  })
    .notNull()
    .$type<z.infer<typeof NotifyConfigSchema>>(),
  token: text("token").notNull().unique("token_idx"),
});
