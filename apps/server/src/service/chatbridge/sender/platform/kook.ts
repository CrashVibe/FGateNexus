import type { KookBot } from "@koishijs/plugin-adapter-kook";
import type { ForkScope } from "koishi";

import type { Target } from "#server/db/schema";
import type { PlatformConfig, PlatformType } from "#shared/model/bot/types";

import { BaseSender } from "./base";
import type { ElementTextMessage } from "./element-message";
import { elementMessageBuilders } from "./element-message";

export default class KookSender extends BaseSender<
  KookBot,
  ElementTextMessage
> {
  constructor(
    platformType: PlatformType,
    botId: number,
    config: PlatformConfig,
    bot: KookBot,
    pluginInstance: ForkScope,
  ) {
    super(
      platformType,
      botId,
      config,
      bot,
      pluginInstance,
      elementMessageBuilders,
    );
  }

  protected override async send(
    target: Target,
    message: ElementTextMessage,
  ): Promise<void> {
    await this.bot.sendMessage(target.channelId, message.message);
  }

  override async setGroupCard(
    target: Target,
    userId: string,
    card: string,
  ): Promise<void> {
    if (!target.guildId) {
      throw new Error("缺少 guildId，无法修改群名片");
    }
    await this.bot.setGroupNickname(target.guildId, userId, card);
  }
}
