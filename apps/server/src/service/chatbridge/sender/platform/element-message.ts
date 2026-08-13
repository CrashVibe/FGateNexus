import { h } from "koishi";
import type { Element } from "koishi";

import { renderMinecraftTextToImage } from "#server/utils/mc-image-render";
import { formatMCToPlatformMessage } from "#shared/utils/chat-sync";
import {
  renderDeathMessage,
  renderJoinMessage,
  renderLeaveMessage,
} from "#shared/utils/template/notify";

import type { PlatformMessage } from "../types";
import type { MessageBuilders } from "./base";
import { toPngDataUri } from "./base";

export interface ElementTextMessage extends PlatformMessage {
  type: "element";
  message: Element.Fragment;
}

/** OneBot / KOOK / Milky 共用 */
export const elementMessageBuilders: MessageBuilders<ElementTextMessage> = {
  async buildChatMessage(payload, chatSyncConfig, serverName) {
    return {
      message: formatMCToPlatformMessage(chatSyncConfig.mcToPlatformTemplate, {
        ...payload,
        serverName,
      }),
      type: "element",
    };
  },

  async buildCommandMessage(payload, commandConfig, log) {
    const text = `指令执行${payload.success ? "成功" : "失败"}：\n${payload.message}`;
    if (commandConfig.imageRender) {
      try {
        const buf = await renderMinecraftTextToImage(text);
        return {
          message: h.image(toPngDataUri(buf)),
          type: "element",
        };
      } catch (error) {
        log.error(error, "渲染图片失败，降级为 text");
      }
    }
    return { message: text, type: "element" };
  },

  async buildDeathMessage(payload, notifyConfig) {
    return {
      message: renderDeathMessage(
        notifyConfig.death_notify_message,
        payload.playerName,
        payload.deathMessage ?? "未知原因",
      ),
      type: "element",
    };
  },

  async buildJoinMessage(payload, notifyConfig) {
    return {
      message: renderJoinMessage(
        notifyConfig.join_notify_message,
        payload.playerName,
      ),
      type: "element",
    };
  },

  async buildLeaveMessage(payload, notifyConfig) {
    return {
      message: renderLeaveMessage(
        notifyConfig.leave_notify_message,
        payload.playerName,
      ),
      type: "element",
    };
  },

  async buildNotifyMessage(payload) {
    return { message: payload.message, type: "element" };
  },

  async buildTemplateMessage(payload) {
    if (payload.success) {
      return { message: h.image(toPngDataUri(payload.image)), type: "element" };
    }
    return { message: `模板渲染失败：${payload.error}`, type: "element" };
  },
};
