import type { OneBot } from "@mrlingxd/koishi-plugin-adapter-onebot";
import type { ForkScope } from "koishi";

import type { Target } from "#server/db/schema";
import type { PlatformConfig, PlatformType } from "#shared/model/bot/types";

import type { FlatChannels } from "../types";
import { BaseSender } from "./base";
import type { ElementTextMessage } from "./element-message";
import { elementMessageBuilders } from "./element-message";

export default class OneBotSender extends BaseSender<
  OneBot,
  ElementTextMessage
> {
  constructor(
    platformType: PlatformType,
    botId: number,
    config: PlatformConfig,
    bot: OneBot,
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
    if (target.type === "group") {
      await this.bot.sendMessage(target.channelId, message.message);
    }
    await this.bot.sendPrivateMessage(target.channelId, message.message);
  }

  override async listChannels(): Promise<FlatChannels> {
    return await this.cached("channels", async () => {
      const groupList = await this.bot.internal.getGroupList();
      const friendList = await this.bot.internal.getFriendList();
      const groups = groupList.map((g) => ({
        avatar: `https://p.qlogo.cn/gh/${g.group_id}/${g.group_id}/640`,
        id: String(g.group_id),
        name: g.group_name || `群 ${g.group_id}`,
        type: "group" as const,
      }));
      const friends = friendList.map((f) => ({
        avatar: `http://q.qlogo.cn/headimg_dl?dst_uin=${f.user_id}&spec=640&img_type=jpg`,
        id: String(f.user_id),
        name: f.nickname || f.remark || `用户 ${f.user_id}`,
        type: "private" as const,
      }));
      return [...groups, ...friends];
    });
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
    await this.bot.internal.setGroupCard(groupIdNumber, userIdNumber, card);
  }
}
