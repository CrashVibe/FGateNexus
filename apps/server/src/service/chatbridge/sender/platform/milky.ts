import type { ForkScope } from "koishi";
import type MilkyBot from "koishi-plugin-adapter-milky";

import type { Target } from "#server/db/schema";
import type { PlatformConfig, PlatformType } from "#shared/model/bot/types";

import { BaseSender } from "./base";
import type { ElementTextMessage } from "./element-message";
import { elementMessageBuilders } from "./element-message";

export default class MilkySender extends BaseSender<
  MilkyBot,
  ElementTextMessage
> {
  constructor(
    platformType: PlatformType,
    botId: number,
    config: PlatformConfig,
    bot: MilkyBot,
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
    // channelId 自带 scene 前缀（群号 / "private:qq号"），适配器按格式自动路由
    await this.bot.sendMessage(target.channelId, message.message);
  }

  override async setGroupCard(
    target: Target,
    userId: string,
    card: string,
  ): Promise<void> {
    const groupIdNumber = Number(target.channelId);
    const userIdNumber = Number(userId);
    if (!Number.isFinite(groupIdNumber) || !Number.isFinite(userIdNumber)) {
      throw new TypeError("群组 ID 或用户 ID 非法");
    }
    await this.bot.internal.setGroupMemberCard(
      groupIdNumber,
      userIdNumber,
      card,
    );
  }
}
