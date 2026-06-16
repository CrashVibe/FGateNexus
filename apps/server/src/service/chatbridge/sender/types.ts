import type { ForkScope } from "koishi";

import type { Target } from "#server/db/schema";
import type { PlatformConfig, PlatformType } from "#shared/model/bot/types";
import type { ChatSyncConfig } from "#shared/model/server/schema/chat-sync";
import type { CommandConfig } from "#shared/model/server/schema/command";
import type { NotifyConfig } from "#shared/model/server/schema/notify";

import type { MCEvent } from "../../mcwsbridge/types";
import type { AdapterBot } from "../types";

export interface PlatformMessage {
  type: string;
}

export interface PlatformSender {
  readonly platformType: PlatformType;
  readonly botId: number;
  config: PlatformConfig;
  readonly bot: AdapterBot;
  readonly pluginInstance: ForkScope;

  setGroupCard(target: Target, userId: string, card: string): Promise<void>;

  onChat(
    event: MCEvent<"player.chat">,
    target: Target,
    chatSyncConfig: ChatSyncConfig,
    serverName: string,
  ): Promise<void>;
  onDeath(
    event: MCEvent<"player.death">,
    target: Target,
    notifyConfig: NotifyConfig,
  ): Promise<void>;
  onJoin(
    event: MCEvent<"player.join">,
    target: Target,
    notifyConfig: NotifyConfig,
  ): Promise<void>;
  onLeave(
    event: MCEvent<"player.leave">,
    target: Target,
    notifyConfig: NotifyConfig,
  ): Promise<void>;
  onCommand(
    event: MCEvent<"execute.command">,
    target: Target,
    commandConfig: CommandConfig,
  ): Promise<void>;
  onNotify(event: MCEvent<"system.notify">, target: Target): Promise<void>;
  onTemplate(event: MCEvent<"system.template">, target: Target): Promise<void>;

  isOnline(): boolean;
}
