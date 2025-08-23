import { type NotifyConfig, NotifyConfigSchema } from "../schemas/server/notify";

/**
 * 获取默认通知配置
 */
export function getDefaultNotifyConfig(): NotifyConfig {
    return NotifyConfigSchema.parse({});
}
