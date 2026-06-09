import { z } from "zod";

import type { ServersAPI } from "#shared/model/server/api";

import { ServerNameSchema } from "../validators";
import { BindingConfigSchema } from "./binding";
import { ChatSyncConfigSchema } from "./chat-sync";
import { CommandConfigSchema } from "./command";
import { NotifyConfigSchema } from "./notify";
import { targetSchema } from "./target";

export const ServerResponseSchema = z.object({
  bindingConfig: BindingConfigSchema,
  botId: z.number().nullable(),
  chatSyncConfig: ChatSyncConfigSchema,
  commandConfig: CommandConfigSchema,
  id: z.number(),
  isOnline: z.boolean(),
  minecraft_software: z.string().nullable(),
  minecraft_version: z.string().nullable(),
  name: ServerNameSchema,
  notifyConfig: NotifyConfigSchema,
  targets: z.array(targetSchema),
  token: z.string(),
});

export type ServerWithStatus = z.infer<typeof ServersAPI.GET.response>;
