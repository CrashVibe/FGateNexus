import type { ApiSchemaRegistry } from "..";
import { v4 as uuidv4 } from "uuid";
import { z } from "zod";

/**
 * 目标配置
 */
export const TargetConfigSchema = z.object({
  CommandConfigSchema: z
    .object({
      /**
       * 是否启用
       */
      enabled: z.boolean().default(false),

      /**
       * 权限
       * 当前适配器和对应目标的权限
       */
      permissions: z.array(z.string()).default([]),

      /**
       * 执行指令前缀
       */
      prefix: z.string().default("/")
    })
    .default({
      enabled: false,
      permissions: [],
      prefix: "/"
    }),

  chatSyncConfigSchema: z
    .object({
      /**
       * 是否启用聊天同步
       */
      enabled: z.boolean().default(false)
    })
    .default({
      enabled: false
    }),

  NotifyConfigSchema: z
    .object({
      /**
       * 是否启用聊天同步
       */
      enabled: z.boolean().default(false)
    })
    .default({
      enabled: false
    })
});

export type TargetConfig = z.infer<typeof TargetConfigSchema>;
export type targetResponse = z.infer<typeof targetSchema>;
export const targetSchemaRequest = z.object({
  targetId: z.string().default(""),
  type: z.enum(["group", "private"]).default("group"),
  enabled: z.boolean().default(true),
  config: TargetConfigSchema.default(TargetConfigSchema.parse({}))
});

export const targetSchema = z.object({
  id: z.string().default(() => uuidv4()),
  targetId: z.string().nonempty("目标 ID 不能为空"),
  type: z.enum(["group", "private"]).default("group"),
  enabled: z.boolean().default(true),
  config: TargetConfigSchema.default(TargetConfigSchema.parse({})),
  createdAt: z.coerce.date().default(() => new Date()),
  updatedAt: z.coerce.date().default(() => new Date())
});

export type targetSchemaRequestType = z.infer<typeof targetSchemaRequest>;

export const TargetAPI = {
  GETS: {
    description: "获取目标信息",
    request: z.object({}),
    response: z.array(targetSchema)
  },
  POST: {
    description: "批量创建目标",
    request: z.array(targetSchemaRequest).nonempty(),
    response: z.array(targetSchema).nonempty()
  },
  PATCH: {
    description: "批量更新目标",
    request: z.object({
      items: z
        .array(
          z.object({
            id: z.string().min(1, "缺少目标 ID"),
            data: targetSchemaRequest
          })
        )
        .nonempty("至少需要一条更新项")
    }),
    response: z.array(targetSchema).nonempty()
  },
  DELETE: {
    description: "批量删除目标",
    request: z.object({
      ids: z.array(z.string()).nonempty()
    }),
    response: z.array(targetSchema).nonempty()
  }
} satisfies ApiSchemaRegistry;
