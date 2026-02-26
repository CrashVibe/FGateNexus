import type z from "zod";
import type { BindingConfig } from "~~/shared/schemas/server/binding";
import type { ChatSyncConfig } from "~~/shared/schemas/server/chatSync";
import type { CommandConfig } from "~~/shared/schemas/server/command";
import type { NotifyConfigSchema } from "~~/shared/schemas/server/notify";

import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

import { adapters } from "./adapters";
export const servers = sqliteTable("servers", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull().unique("name_idx"),
  token: text("token").notNull().unique("token_idx"),
  minecraft_version: text("version"),
  minecraft_software: text("software"),
  adapterId: integer("adapter_id").references(() => adapters.id, { onDelete: "set null" }),
  bindingConfig: text("binding_config", { mode: "json" }).notNull().$type<BindingConfig>(),
  chatSyncConfig: text("chat_sync_config", { mode: "json" }).notNull().$type<ChatSyncConfig>(),
  commandConfig: text("command_config", { mode: "json" }).notNull().$type<CommandConfig>(),
  notifyConfig: text("notify_config", {
    mode: "json"
  })
    .notNull()
    .$type<z.infer<typeof NotifyConfigSchema>>()
});
