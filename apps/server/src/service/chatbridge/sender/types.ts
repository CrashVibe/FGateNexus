import type { ForkScope } from "koishi";
import type { z } from "zod";

import type { Target } from "#server/db/schema";
import type { BotAPI } from "#shared/model/bot/api";
import type { PlatformConfig, PlatformType } from "#shared/model/bot/types";
import type { ChatSyncConfig } from "#shared/model/server/schema/chat-sync";
import type { CommandConfig } from "#shared/model/server/schema/command";
import type { NotifyConfig } from "#shared/model/server/schema/notify";

import type { MCEvent } from "../../mcwsbridge/types";
import type { AdapterBot } from "../types";

export type FlatChannels = z.infer<typeof BotAPI.ONEBOT_CHANNELS.response>;
export type GroupedChannels = z.infer<typeof BotAPI.DISCORD_CHANNELS.response>;
export type ChannelList = FlatChannels | GroupedChannels;
export type RoleList = z.infer<typeof BotAPI.ROLES.response>;

export interface PlatformMessage {
  type: string;
}

export interface PlatformSender {
  readonly platformType: PlatformType;
  readonly botId: number;
  config: PlatformConfig;
  readonly bot: AdapterBot;
  readonly pluginInstance: ForkScope;

  setGroupCard: (target: Target, userId: string, card: string) => Promise<void>;

  onChat: (
    event: MCEvent<"player.chat">,
    target: Target,
    chatSyncConfig: ChatSyncConfig,
    serverName: string,
  ) => Promise<void>;
  onDeath: (
    event: MCEvent<"player.death">,
    target: Target,
    notifyConfig: NotifyConfig,
  ) => Promise<void>;
  onJoin: (
    event: MCEvent<"player.join">,
    target: Target,
    notifyConfig: NotifyConfig,
  ) => Promise<void>;
  onLeave: (
    event: MCEvent<"player.leave">,
    target: Target,
    notifyConfig: NotifyConfig,
  ) => Promise<void>;
  onCommand: (
    event: MCEvent<"execute.command">,
    target: Target,
    commandConfig: CommandConfig,
  ) => Promise<void>;
  onNotify: (event: MCEvent<"system.notify">, target: Target) => Promise<void>;
  onTemplate: (
    event: MCEvent<"system.template">,
    target: Target,
  ) => Promise<void>;

  isOnline: () => boolean;
  listChannels: () => Promise<ChannelList>;
  /** 只有 Discord / KOOK 有权限组 */
  listRoles?: (guildId: string) => Promise<RoleList>;
}
