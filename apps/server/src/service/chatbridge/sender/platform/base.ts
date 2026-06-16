import type { ForkScope } from "koishi";

import type { Target } from "#server/db/schema";
import { logger } from "#server/utils/logger";
import type { PlatformConfig, PlatformType } from "#shared/model/bot/types";
import type { ChatSyncConfig } from "#shared/model/server/schema/chat-sync";
import type { CommandConfig } from "#shared/model/server/schema/command";
import type { NotifyConfig } from "#shared/model/server/schema/notify";
import { shouldForwardMessage } from "#shared/utils/chat-sync";

import type { MCEvent } from "../../../mcwsbridge/types";
import type { AdapterBot } from "../../types";
import type { PlatformMessage, PlatformSender } from "../types";

export const toPngDataUri = (image: Buffer): string =>
  `data:image/png;base64,${image.toString("base64")}`;

export abstract class BaseSender<
  B extends AdapterBot = AdapterBot,
  M extends PlatformMessage = PlatformMessage,
> implements PlatformSender {
  platformType: PlatformType;
  botId: number;
  config: PlatformConfig;
  pluginInstance: ForkScope;
  bot: B;

  protected readonly logger;

  constructor(
    platformType: PlatformType,
    botId: number,
    config: PlatformConfig,
    bot: B,
    pluginInstance: ForkScope,
  ) {
    this.platformType = platformType;
    this.botId = botId;
    this.config = config;
    this.bot = bot;
    this.pluginInstance = pluginInstance;
    this.logger = logger.child(
      { botId: this.botId, platformType: this.platformType },
      { msgPrefix: `[${this.platformType} Sender](Bot #${this.botId}) ` },
    );
  }

  protected abstract buildChatMessage(
    payload: MCEvent<"player.chat">["payload"],
    chatSyncConfig: ChatSyncConfig,
    serverName: string,
  ): Promise<M>;

  protected abstract buildDeathMessage(
    payload: MCEvent<"player.death">["payload"],
    notifyConfig: NotifyConfig,
  ): Promise<M>;

  protected abstract buildJoinMessage(
    payload: MCEvent<"player.join">["payload"],
    notifyConfig: NotifyConfig,
  ): Promise<M>;

  protected abstract buildLeaveMessage(
    payload: MCEvent<"player.leave">["payload"],
    notifyConfig: NotifyConfig,
  ): Promise<M>;

  protected abstract buildCommandMessage(
    payload: MCEvent<"execute.command">["payload"],
    commandConfig: CommandConfig,
  ): Promise<M>;

  protected abstract send(target: Target, message: M): Promise<void>;

  protected abstract buildNotifyMessage(
    payload: MCEvent<"system.notify">["payload"],
  ): Promise<M>;

  protected abstract buildTemplateMessage(
    payload: MCEvent<"system.template">["payload"],
  ): Promise<M>;

  abstract setGroupCard(
    target: Target,
    userId: string,
    card: string,
  ): Promise<void>;

  async onChat(
    event: MCEvent<"player.chat">,
    target: Target,
    chatSyncConfig: ChatSyncConfig,
    serverName: string,
  ): Promise<void> {
    if (!this.guardOnline()) {
      return;
    }

    if (!chatSyncConfig.mcToPlatformEnabled) {
      return;
    }
    if (!shouldForwardMessage(event.payload.message, chatSyncConfig)) {
      return;
    }

    const message = await this.buildChatMessage(
      event.payload,
      chatSyncConfig,
      serverName,
    );
    await this.send(target, message);
  }

  async onDeath(
    event: MCEvent<"player.death">,
    target: Target,
    notifyConfig: NotifyConfig,
  ): Promise<void> {
    if (!this.guardOnline()) {
      return;
    }

    await this.send(
      target,
      await this.buildDeathMessage(event.payload, notifyConfig),
    );
  }

  async onJoin(
    event: MCEvent<"player.join">,
    target: Target,
    notifyConfig: NotifyConfig,
  ): Promise<void> {
    if (!this.guardOnline()) {
      return;
    }

    await this.send(
      target,
      await this.buildJoinMessage(event.payload, notifyConfig),
    );
  }

  async onLeave(
    event: MCEvent<"player.leave">,
    target: Target,
    notifyConfig: NotifyConfig,
  ): Promise<void> {
    if (!this.guardOnline()) {
      return;
    }

    await this.send(
      target,
      await this.buildLeaveMessage(event.payload, notifyConfig),
    );
  }

  async onCommand(
    event: MCEvent<"execute.command">,
    target: Target,
    commandConfig: CommandConfig,
  ): Promise<void> {
    if (!this.guardOnline()) {
      return;
    }

    await this.send(
      target,
      await this.buildCommandMessage(event.payload, commandConfig),
    );
  }

  async onNotify(
    event: MCEvent<"system.notify">,
    target: Target,
  ): Promise<void> {
    if (!this.guardOnline()) {
      return;
    }

    await this.send(target, await this.buildNotifyMessage(event.payload));
  }

  async onTemplate(
    event: MCEvent<"system.template">,
    target: Target,
  ): Promise<void> {
    if (!this.guardOnline()) {
      return;
    }
    await this.send(target, await this.buildTemplateMessage(event.payload));
  }

  isOnline(): boolean {
    return this.bot.status === 1;
  }

  private guardOnline(): boolean {
    if (!this.isOnline()) {
      this.logger.warn(`机器人未上线`);
      return false;
    }
    return true;
  }
}
