import { z } from "zod";

import type { ApiSchemaRegistry } from "#shared/model";

import { TargetConfigSchema } from "./target";

/**
 * 聊天同步配置 (预留务删)
 */
export const CommandConfigSchema = z.object({
  /**
   * 图片渲染（将颜色代码转换为图片）
   */
  imageRender: z.boolean().default(false),
});

export type CommandConfig = z.infer<typeof CommandConfigSchema>;

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
    response: z.object({}),
  },
} satisfies ApiSchemaRegistry;
