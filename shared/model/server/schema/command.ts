import { z } from "zod";

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
