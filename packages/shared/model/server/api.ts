import { z } from "zod";

import type { ApiSchemaRegistry } from "#shared/model";
import { BindingConfigSchema } from "#shared/model/server/schema/binding";
import { ChatSyncConfigSchema } from "#shared/model/server/schema/chat-sync";
import { CommandConfigSchema } from "#shared/model/server/schema/command";
import { NotifyConfigSchema } from "#shared/model/server/schema/notify";
import { ServerResponseSchema } from "#shared/model/server/schema/servers";
import {
  TargetConfigSchema,
  targetSchema,
  targetSchemaRequest,
} from "#shared/model/server/schema/target";
import {
  ServerNameSchema,
  ServerTokenSchema,
} from "#shared/model/server/validators";

export const BindingAPI = {
  PATCH: {
    description: "更新服务器绑定配置",
    request: z.object({
      config: BindingConfigSchema,
    }),
    response: z.void(),
  },
} satisfies ApiSchemaRegistry;

export const ChatSyncAPI = {
  PATCH: {
    description: "更新服务器聊天同步配置",
    request: z.object({
      chatsync: ChatSyncConfigSchema,
      targets: z.array(
        z.object({
          config: TargetConfigSchema,
          id: z.uuidv4(),
        }),
      ),
    }),
    response: z.void(),
  },
} satisfies ApiSchemaRegistry;

export const CommandAPI = {
  PATCH: {
    description: "更新服务器命令配置",
    request: z.object({
      command: CommandConfigSchema,
      targets: z.array(
        z.object({
          config: TargetConfigSchema,
          id: z.uuidv4(),
        }),
      ),
    }),
    response: z.void(),
  },
} satisfies ApiSchemaRegistry;

export const GeneralAPI = {
  PATCH: {
    description: "更新服务器基础信息",
    request: z.object({
      botId: z.number().nullish(),
      name: ServerNameSchema.optional(),
      token: ServerTokenSchema.optional(),
    }),
    response: z.void(),
  },
} satisfies ApiSchemaRegistry;

export const NotifyAPI = {
  PATCH: {
    description: "更新服务器通知配置",
    request: z.object({
      notify: NotifyConfigSchema,
      targets: z.array(
        z.object({
          config: TargetConfigSchema,
          id: z.uuidv4(),
        }),
      ),
    }),
    response: z.void(),
  },
} satisfies ApiSchemaRegistry;

export const ServersAPI = {
  GET: {
    description: "获取单个服务器信息",
    request: z.void(),
    response: ServerResponseSchema,
  },
  GETS: {
    description: "获取服务器列表",
    request: z.void(),
    response: z.array(ServerResponseSchema),
  },
  POST: {
    description: "添加服务器",
    request: z.object({
      servername: ServerNameSchema,
      token: ServerTokenSchema,
    }),
    response: z.void(),
  },
} satisfies ApiSchemaRegistry;

export const TargetAPI = {
  DELETE: {
    description: "批量删除目标",
    request: z.object({
      ids: z.array(z.string()).nonempty(),
    }),
    response: z.array(targetSchema).nonempty(),
  },
  GETS: {
    description: "获取目标信息",
    request: z.void(),
    response: z.array(targetSchema),
  },
  PATCH: {
    description: "批量更新目标",
    request: z.object({
      items: z
        .array(
          z.object({
            data: targetSchemaRequest,
            id: z.string().min(1, "缺少目标 ID"),
          }),
        )
        .nonempty("至少需要一条更新项"),
    }),
    response: z.array(targetSchema).nonempty(),
  },
  POST: {
    description: "批量创建目标",
    request: z.array(targetSchemaRequest).nonempty(),
    response: z.array(targetSchema).nonempty(),
  },
} satisfies ApiSchemaRegistry;
