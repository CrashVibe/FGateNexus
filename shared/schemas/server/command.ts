import { z } from "zod";
import { TargetConfigSchema } from "./target";

/**
 * 聊天同步配置 (预留务删)
 */
export const CommandConfigSchema = z.object({});

export type CommandConfig = z.infer<typeof CommandConfigSchema>;
export type CommandTarget = CommandConfig["targets"][number];

export const commandPatchBodySchema = z.object({
    command: CommandConfigSchema,
    targets: z.array(
        z.object({
            id: z.uuidv4(),
            config: TargetConfigSchema
        })
    )
});
