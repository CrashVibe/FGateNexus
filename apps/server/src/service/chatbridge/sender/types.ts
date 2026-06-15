import type { ForkScope } from "koishi";

import type { Target } from "#server/db/schema";
import type { PlatformConfig, PlatformType } from "#shared/model/bot/types";

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

  // 核心：每个事件一个方法，有默认实现，平台按需 override
  onChat(event: MCEvent<"player.chat">, target: Target): Promise<void>;
  onDeath(event: MCEvent<"player.death">, target: Target): Promise<void>;
  onJoin(event: MCEvent<"player.join">, target: Target): Promise<void>;
  onLeave(event: MCEvent<"player.leave">, target: Target): Promise<void>;
  onCommand(event: MCEvent<"execute.command">, target: Target): Promise<void>;
  onNotify(event: MCEvent<"system.notify">, target: Target): Promise<void>;
  onTemplate(event: MCEvent<"system.template">, target: Target): Promise<void>;

  isOnline(): boolean;
}
