import type { ApiSchemaRegistry } from "..";
import { v4 as uuidv4 } from "uuid";
import { z } from "zod";
import type { servers } from "~~/server/db/schema";

import { BindingConfigSchema } from "./binding";
import { chatSyncConfigSchema } from "./chatSync";
import { CommandConfigSchema } from "./command";
import { NotifyConfigSchema } from "./notify";
import { targetSchema } from "./target";

export type serverSchema = typeof servers.$inferSelect;

const ServerResponseSchema = z.object({
  id: z.number(),
  name: z.string(),
  token: z.string(),
  minecraft_version: z.string().nullable(),
  minecraft_software: z.string().nullable(),
  adapterId: z.number().nullable(),
  bindingConfig: BindingConfigSchema,
  chatSyncConfig: chatSyncConfigSchema,
  commandConfig: CommandConfigSchema,
  notifyConfig: NotifyConfigSchema,
  isOnline: z.boolean(),
  targets: z.array(targetSchema)
});

export const ServersAPI = {
  GETS: {
    description: "获取服务器列表",
    request: z.object({}),
    response: z.array(ServerResponseSchema)
  },
  GET: {
    description: "获取单个服务器信息",
    request: z.object({}),
    response: ServerResponseSchema
  },
  POST: {
    description: "添加服务器",
    request: z.object({
      servername: z.string().min(2, "长度至少为 2 个字符").max(24, "长度最多为 24 个字符").default(""),
      token: z.string().min(4, "Token 长度至少为 4 个字符").max(64, "Token 长度最多为 64 个字符").default(uuidv4())
    }),
    response: z.object({})
  }
} satisfies ApiSchemaRegistry;

export type ServerWithStatus = z.infer<typeof ServersAPI.GET.response>;
