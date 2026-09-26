import type { ForkScope } from "koishi";

import type { Target } from "#server/db/schema";
import { recordRelay } from "#server/service/relay-log";
import { logger } from "#server/utils/logger";
import type { PlatformConfig, PlatformType } from "#shared/model/bot/types";
import type { ChatSyncConfig } from "#shared/model/server/schema/chat-sync";
import type { CommandConfig } from "#shared/model/server/schema/command";
import type { NotifyConfig } from "#shared/model/server/schema/notify";
import { getFilterReason } from "#shared/utils/chat-sync";

import type { MCEvent } from "../../../mcwsbridge/types";
import type { AdapterBot } from "../../types";
import type { PlatformMessage, PlatformSender } from "../types";

export const toPngDataUri = (image: Buffer): string =>
  `data:image/png;base64,${image.toString("base64")}`;

/** 对齐 pino `logger.error(err, msg)` 签名 */
export interface ErrorLogger {
  error: (obj: unknown, msg: string) => void;
}

/** 各平台的消息构建函数集合。 */
export interface MessageBuilders<M extends PlatformMessage> {
  buildChatMessage: (
    payload: MCEvent<"player.chat">["payload"],
    chatSyncConfig: ChatSyncConfig,
    serverName: string,
  ) => Promise<M>;
  buildDeathMessage: (
    payload: MCEvent<"player.death">["payload"],
    notifyConfig: NotifyConfig,
  ) => Promise<M>;
  buildJoinMessage: (
    payload: MCEvent<"player.join">["payload"],
    notifyConfig: NotifyConfig,
  ) => Promise<M>;
  buildLeaveMessage: (
    payload: MCEvent<"player.leave">["payload"],
    notifyConfig: NotifyConfig,
  ) => Promise<M>;
  buildCommandMessage: (
    payload: MCEvent<"execute.command">["payload"],
    commandConfig: CommandConfig,
    log: ErrorLogger,
  ) => Promise<M>;
  buildNotifyMessage: (
    payload: MCEvent<"system.notify">["payload"],
  ) => Promise<M>;
  buildTemplateMessage: (
    payload: MCEvent<"system.template">["payload"],
  ) => Promise<M>;
}

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
  protected readonly builders: MessageBuilders<M>;

  constructor(
    platformType: PlatformType,
    botId: number,
    config: PlatformConfig,
    bot: B,
    pluginInstance: ForkScope,
    builders: MessageBuilders<M>,
  ) {
    this.platformType = platformType;
    this.botId = botId;
    this.config = config;
    this.bot = bot;
    this.pluginInstance = pluginInstance;
    this.builders = builders;
    this.logger = logger.child(
      { botId: this.botId, platformType: this.platformType },
      { msgPrefix: `[${this.platformType} Sender](Bot #${this.botId}) ` },
    );
  }

  protected abstract send(target: Target, message: M): Promise<void>;

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
    const relay = {
      direction: "mc_to_platform",
      from: event.payload.playerName,
      serverId: event.serverId,
      target: target.channelId,
      text: event.payload.message,
    } as const;
    if (!this.guardOnline()) {
      recordRelay({ ...relay, reason: "机器人不在线", status: "failed" });
      return;
    }
    if (!chatSyncConfig.mcToPlatformEnabled) {
      recordRelay({ ...relay, reason: "未开启 MC → 平台", status: "skipped" });
      return;
    }
    const reason = getFilterReason(event.payload.message, chatSyncConfig);
    if (reason !== null) {
      recordRelay({ ...relay, reason, status: "filtered" });
      return;
    }

    try {
      const message = await this.builders.buildChatMessage(
        event.payload,
        chatSyncConfig,
        serverName,
      );
      await this.send(target, message);
      recordRelay({ ...relay, status: "sent" });
    } catch (error) {
      recordRelay({
        ...relay,
        reason: error instanceof Error ? error.message : String(error),
        status: "failed",
      });
      throw error;
    }
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
      await this.builders.buildDeathMessage(event.payload, notifyConfig),
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
      await this.builders.buildJoinMessage(event.payload, notifyConfig),
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
      await this.builders.buildLeaveMessage(event.payload, notifyConfig),
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
      await this.builders.buildCommandMessage(
        event.payload,
        commandConfig,
        this.logger,
      ),
    );
  }

  async onNotify(
    event: MCEvent<"system.notify">,
    target: Target,
  ): Promise<void> {
    if (!this.guardOnline()) {
      return;
    }

    await this.send(
      target,
      await this.builders.buildNotifyMessage(event.payload),
    );
  }

  async onTemplate(
    event: MCEvent<"system.template">,
    target: Target,
  ): Promise<void> {
    if (!this.guardOnline()) {
      return;
    }
    await this.send(
      target,
      await this.builders.buildTemplateMessage(event.payload),
    );
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
