import { type CommandConfig, CommandConfigSchema } from "../schemas/server/command";

/**
 * 获取默认聊天同步配置
 */
export function getDefaultCommandConfig(): CommandConfig {
    return CommandConfigSchema.parse({});
}
