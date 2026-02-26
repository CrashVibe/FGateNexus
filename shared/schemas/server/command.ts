import { z } from "zod";

import type { ApiSchemaRegistry } from "..";

import { TargetConfigSchema } from "./target";

/**
 * 聊天同步配置 (预留务删)
 */
export const CommandConfigSchema = z.object({});

export type CommandConfig = z.infer<typeof CommandConfigSchema>;

export const CommandAPI = {
  PATCH: {
    description: "更新服务器命令配置",
    request: z.object({
      command: CommandConfigSchema,
      targets: z.array(
        z.object({
          id: z.uuidv4(),
          config: TargetConfigSchema
        })
      )
    }),
    response: z.object({})
  }
} satisfies ApiSchemaRegistry;
