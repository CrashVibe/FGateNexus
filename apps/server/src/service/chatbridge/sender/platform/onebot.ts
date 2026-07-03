import type { OneBot } from "@mrlingxd/koishi-plugin-adapter-onebot";
import { h } from "koishi";
import type { Element } from "koishi";

import type { Target } from "#server/db/schema";
import type { MCEvent } from "#server/service/mcwsbridge/types";
import { renderMinecraftTextToImage } from "#server/utils/mc-image-render";
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
  type: "element";
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
      type: "element",
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
      type: "element",
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
      type: "element",
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
      type: "element",
    };
  }
  protected override async buildCommandMessage(
    payload: MCEvent<"execute.command">["payload"],
    commandConfig: CommandConfig,
  ): Promise<OneBotTextMessage> {
    const text = `指令执行${payload.success ? "成功" : "失败"}：\n${payload.message}`;
    if (commandConfig.imageRender) {
      try {
        const buf = await renderMinecraftTextToImage(text);
        return {
          message: h.image(toPngDataUri(buf)),
          type: "element",
        };
      } catch (error) {
        this.logger.error(error, "渲染图片失败，降级为 text");
      }
    }

    return {
      message: text,
      type: "element",
    };
  }
  protected override async buildNotifyMessage(
    payload: MCEvent<"system.notify">["payload"],
  ): Promise<OneBotTextMessage> {
    return { message: payload.message, type: "element" };
  }

  protected override async buildTemplateMessage(
    payload: MCEvent<"system.template">["payload"],
  ): Promise<OneBotTextMessage> {
    if (payload.success) {
      return {
        message: h.image(toPngDataUri(payload.image)),
        type: "element",
      };
    }
    return { message: `模板渲染失败：${payload.error}`, type: "element" };
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
