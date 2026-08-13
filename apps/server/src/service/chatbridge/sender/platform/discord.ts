import type { DiscordBot } from "@koishijs/plugin-adapter-discord";
import type { ForkScope } from "koishi";

import type { Target } from "#server/db/schema";
import type { PlatformConfig, PlatformType } from "#shared/model/bot/types";

import { BaseSender } from "./base";
import { discordMessageBuilders } from "./discord-message";
import type {
  DiscordEmbedMessage,
  DiscordImageMessage,
} from "./discord-message";

export { DiscordColor } from "./discord-message";

type DiscordMessage = DiscordEmbedMessage | DiscordImageMessage;

export default class DiscordSender extends BaseSender<
  DiscordBot,
  DiscordMessage
> {
  constructor(
    platformType: PlatformType,
    botId: number,
    config: PlatformConfig,
    bot: DiscordBot,
    pluginInstance: ForkScope,
  ) {
    super(
      platformType,
      botId,
      config,
      bot,
      pluginInstance,
      discordMessageBuilders,
    );
  }

  protected override async send(
    target: Target,
    message: DiscordMessage,
  ): Promise<void> {
    if (message.type === "image") {
      await this.bot.sendMessage(target.channelId, message.content);
      return;
    }
    await this.bot.internal.createMessage(target.channelId, {
      embeds: [message.embed],
    });
  }

  override async setGroupCard(
    target: Target,
    userId: string,
    card: string,
  ): Promise<void> {
    if (target.type !== "group") {
      throw new Error("Discord 仅支持修改群名片");
    }
    if (!target.guildId) {
      throw new Error("缺少 guildId，无法修改群名片");
    }
    await this.bot.internal.modifyGuildMember(target.guildId, userId, {
      nick: card,
    });
  }
}
