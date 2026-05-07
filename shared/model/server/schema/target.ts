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
      prefix: z.string().default("/"),
    })
    .default({
      enabled: false,
      permissions: [],
      prefix: "/",
    }),

  NotifyConfigSchema: z
    .object({
      /**
       * 是否启用聊天同步
       */
      enabled: z.boolean().default(false),
    })
    .default({
      enabled: false,
    }),

  chatSyncConfigSchema: z
    .object({
      /**
       * 是否启用聊天同步
       */
      enabled: z.boolean().default(false),
    })
    .default({
      enabled: false,
    }),
});

export type TargetConfig = z.infer<typeof TargetConfigSchema>;
export type targetResponse = z.infer<typeof targetSchema>;
export const targetSchemaRequest = z.object({
  config: TargetConfigSchema.default(TargetConfigSchema.parse({})),
  enabled: z.boolean().default(true),
  targetId: z.string().nonempty("目标 ID 不能为空"),
  type: z.enum(["group", "private"]).default("group"),
});

export const targetSchema = z.object({
  config: TargetConfigSchema.default(TargetConfigSchema.parse({})),
  createdAt: z.coerce.date().default(() => new Date()),
  enabled: z.boolean().default(true),
  id: z.string().default(() => uuidv4()),
  targetId: z.string().nonempty("目标 ID 不能为空"),
  type: z.enum(["group", "private"]).default("group"),
  updatedAt: z.coerce.date().default(() => new Date()),
});

export type targetSchemaRequestType = z.infer<typeof targetSchemaRequest>;
