import type { OneBot } from "@mrlingxd/koishi-plugin-adapter-onebot";
import type { Target } from "~~/server/db/schema";
import type { MCEvent } from "~~/server/service/mcwsbridge/types";
import {
  renderDeathMessage,
  renderJoinMessage,
  renderLeaveMessage,
} from "~~/shared/utils/template/notify";

import type { PlatformMessage } from "../types";
import { BaseSender } from "./base";

interface OneBotTextMessage extends PlatformMessage {
  type: "text";
  message: string;
}

export default class OneBotSender extends BaseSender<
  OneBot,
  OneBotTextMessage
> {
  protected override async buildChatMessage(
    payload: MCEvent<"player.chat">["payload"],
    server: Awaited<ReturnType<typeof BaseSender.getServer>>,
  ): Promise<OneBotTextMessage> {
    return {
      message: formatMCToPlatformMessage(
        server.chatSyncConfig.mcToPlatformTemplate,
        {
          ...payload,
          serverName: server.name,
        },
      ),
      type: "text",
    };
  }
  protected override async buildDeathMessage(
    payload: MCEvent<"player.death">["payload"],
    server: Awaited<ReturnType<typeof BaseSender.getServer>>,
  ): Promise<OneBotTextMessage> {
    return {
      message: renderDeathMessage(
        server.notifyConfig.death_notify_message,
        payload.playerName,
        payload.deathMessage ?? "未知原因",
      ),
      type: "text",
    };
  }
  protected override async buildJoinMessage(
    payload: MCEvent<"player.join">["payload"],
    server: Awaited<ReturnType<typeof BaseSender.getServer>>,
  ): Promise<OneBotTextMessage> {
    return {
      message: renderJoinMessage(
        server.notifyConfig.join_notify_message,
        payload.playerName,
      ),
      type: "text",
    };
  }
  protected override async buildLeaveMessage(
    payload: MCEvent<"player.leave">["payload"],
    server: Awaited<ReturnType<typeof BaseSender.getServer>>,
  ): Promise<OneBotTextMessage> {
    return {
      message: renderLeaveMessage(
        server.notifyConfig.leave_notify_message,
        payload.playerName,
      ),
      type: "text",
    };
  }
  protected override async buildCommandMessage(
    payload: MCEvent<"execute.command">["payload"],
    server: Awaited<ReturnType<typeof BaseSender.getServer>>,
  ): Promise<OneBotTextMessage> {
    return {
      message: `指令执行${payload.success ? "成功" : "失败"}：\n${payload.message}`,
      type: "text",
    };
  }
  protected override async send(
    target: Target,
    message: OneBotTextMessage,
  ): Promise<void> {
    if (target.type === "group") {
      await this.bot.sendMessage(target.channelId, message.message);
    }
    await this.bot.sendPrivateMessage(target.channelId, message.message);
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
