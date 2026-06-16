import type { OneBot } from "@mrlingxd/koishi-plugin-adapter-onebot";
import { h } from "koishi";
import type { Element } from "koishi";

import type { Target } from "#server/db/schema";
import type { MCEvent } from "#server/service/mcwsbridge/types";
import type { ChatSyncConfig } from "#shared/model/server/schema/chat-sync";
import type { CommandConfig } from "#shared/model/server/schema/command";
import type { NotifyConfig } from "#shared/model/server/schema/notify";
import { formatMCToPlatformMessage } from "#shared/utils/chat-sync";
import {
  renderDeathMessage,
  renderJoinMessage,
  renderLeaveMessage,
} from "#shared/utils/template/notify";

import type { PlatformMessage } from "../types";
import { BaseSender, toPngDataUri } from "./base";

interface OneBotTextMessage extends PlatformMessage {
  type: "text";
  message: Element.Fragment;
}

export default class OneBotSender extends BaseSender<
  OneBot,
  OneBotTextMessage
> {
  protected override async buildChatMessage(
    payload: MCEvent<"player.chat">["payload"],
    chatSyncConfig: ChatSyncConfig,
    serverName: string,
  ): Promise<OneBotTextMessage> {
    return {
      message: formatMCToPlatformMessage(chatSyncConfig.mcToPlatformTemplate, {
        ...payload,
        serverName,
      }),
      type: "text",
    };
  }
  protected override async buildDeathMessage(
    payload: MCEvent<"player.death">["payload"],
    notifyConfig: NotifyConfig,
  ): Promise<OneBotTextMessage> {
    return {
      message: renderDeathMessage(
        notifyConfig.death_notify_message,
        payload.playerName,
        payload.deathMessage ?? "未知原因",
      ),
      type: "text",
    };
  }
  protected override async buildJoinMessage(
    payload: MCEvent<"player.join">["payload"],
    notifyConfig: NotifyConfig,
  ): Promise<OneBotTextMessage> {
    return {
      message: renderJoinMessage(
        notifyConfig.join_notify_message,
        payload.playerName,
      ),
      type: "text",
    };
  }
  protected override async buildLeaveMessage(
    payload: MCEvent<"player.leave">["payload"],
    notifyConfig: NotifyConfig,
  ): Promise<OneBotTextMessage> {
    return {
      message: renderLeaveMessage(
        notifyConfig.leave_notify_message,
        payload.playerName,
      ),
      type: "text",
    };
  }
  protected override async buildCommandMessage(
    payload: MCEvent<"execute.command">["payload"],
    _commandConfig: CommandConfig,
  ): Promise<OneBotTextMessage> {
    return {
      message: `指令执行${payload.success ? "成功" : "失败"}：\n${payload.message}`,
      type: "text",
    };
  }
  protected override async buildNotifyMessage(
    payload: MCEvent<"system.notify">["payload"],
  ): Promise<OneBotTextMessage> {
    return { message: payload.message, type: "text" };
  }

  protected override async buildTemplateMessage(
    payload: MCEvent<"system.template">["payload"],
  ): Promise<OneBotTextMessage> {
    if (payload.success) {
      return {
        message: h.image(toPngDataUri(payload.image)),
        type: "text",
      };
    }
    return { message: `模板渲染失败：${payload.error}`, type: "text" };
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
