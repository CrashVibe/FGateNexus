import type { ForkScope } from "koishi";

import { getServerByIdWithBotAndTargets } from "#server/db/queries/server";
import type { Target } from "#server/db/schema";
import { logger } from "#server/utils/logger";
import type { PlatformConfig, PlatformType } from "#shared/model/bot/types";
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
    server: Awaited<ReturnType<typeof BaseSender.getServer>>,
  ): Promise<M>;

  protected abstract buildDeathMessage(
    payload: MCEvent<"player.death">["payload"],
    server: Awaited<ReturnType<typeof BaseSender.getServer>>,
  ): Promise<M>;

  protected abstract buildJoinMessage(
    payload: MCEvent<"player.join">["payload"],
    server: Awaited<ReturnType<typeof BaseSender.getServer>>,
  ): Promise<M>;

  protected abstract buildLeaveMessage(
    payload: MCEvent<"player.leave">["payload"],
    server: Awaited<ReturnType<typeof BaseSender.getServer>>,
  ): Promise<M>;

  protected abstract buildCommandMessage(
    payload: MCEvent<"execute.command">["payload"],
    server: Awaited<ReturnType<typeof BaseSender.getServer>>,
  ): Promise<M>;

  protected abstract send(target: Target, message: M): Promise<void>;

  protected abstract buildNotifyMessage(
    payload: MCEvent<"system.notify">["payload"],
    server: Awaited<ReturnType<typeof BaseSender.getServer>>,
  ): Promise<M>;

  protected abstract buildTemplateMessage(
    payload: MCEvent<"system.template">["payload"],
  ): Promise<M>;

  abstract setGroupCard(
    target: Target,
    userId: string,
    card: string,
  ): Promise<void>;

  async onChat(event: MCEvent<"player.chat">, target: Target): Promise<void> {
    const server = await BaseSender.getServer(event.serverId);
    if (!server || !this.guardOnline()) {
      return;
    }

    const { chatSyncConfig } = server;

    if (!chatSyncConfig.mcToPlatformEnabled) {
      return;
    }
    if (!shouldForwardMessage(event.payload.message, chatSyncConfig)) {
      return;
    }

    const message = await this.buildChatMessage(event.payload, server);
    await this.send(target, message);
  }

  async onDeath(event: MCEvent<"player.death">, target: Target): Promise<void> {
    const server = await BaseSender.getServer(event.serverId);
    if (!server || !this.guardOnline()) {
      return;
    }

    await this.send(
      target,
      await this.buildDeathMessage(event.payload, server),
    );
  }

  async onJoin(event: MCEvent<"player.join">, target: Target): Promise<void> {
    const server = await BaseSender.getServer(event.serverId);
    if (!server || !this.guardOnline()) {
      return;
    }

    await this.send(target, await this.buildJoinMessage(event.payload, server));
  }

  async onLeave(event: MCEvent<"player.leave">, target: Target): Promise<void> {
    const server = await BaseSender.getServer(event.serverId);
    if (!server || !this.guardOnline()) {
      return;
    }

    await this.send(
      target,
      await this.buildLeaveMessage(event.payload, server),
    );
  }

  async onCommand(
    event: MCEvent<"execute.command">,
    target: Target,
  ): Promise<void> {
    const server = await BaseSender.getServer(event.serverId);
    if (!server || !this.guardOnline()) {
      return;
    }

    await this.send(
      target,
      await this.buildCommandMessage(event.payload, server),
    );
  }

  async onNotify(
    event: MCEvent<"system.notify">,
    target: Target,
  ): Promise<void> {
    const server = await BaseSender.getServer(event.serverId);
    if (!server || !this.guardOnline()) {
      return;
    }

    await this.send(
      target,
      await this.buildNotifyMessage(event.payload, server),
    );
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

  protected static async getServer(serverId: number) {
    const server = await getServerByIdWithBotAndTargets(serverId);
    if (!server || !server?.bot) {
      throw new Error(`服务器 ${serverId} 或其 Bot 未找到`);
    }
    return server;
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
