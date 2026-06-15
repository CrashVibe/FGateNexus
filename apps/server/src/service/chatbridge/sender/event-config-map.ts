import type { TargetConfig } from "#shared/model/server/schema/target";

import type { MCEventType } from "../../mcwsbridge/types";

type ConfigCHecker = (config: TargetConfig) => boolean;

/**
 * 事件配置映射
 * 定义每个事件类型对应的配置项检查函数
 * 用于在处理事件前检查目标配置是否启用对应功能
 */
export const eventConfigMap: Record<MCEventType, ConfigCHecker> = {
  "execute.command": (c) => c.CommandConfigSchema.enabled,
  "player.chat": (c) => c.chatSyncConfigSchema.enabled,
  "player.death": (c) => c.NotifyConfigSchema.player_disappoint_notify,
  "player.join": (c) => c.NotifyConfigSchema.player_notify,
  "player.leave": (c) => c.NotifyConfigSchema.player_notify,
  "system.notify": () => true,
  "system.template": () => true,
};
