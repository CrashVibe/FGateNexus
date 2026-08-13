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

export interface DiscordEmbedMessage extends PlatformMessage {
  type: "embed";
  embed: {
    description: string;
    color: number;
    author?: { name: string; icon_url?: string };
    timestamp?: string;
  };
}

export interface DiscordImageMessage extends PlatformMessage {
  type: "image";
  content: Element.Fragment;
}

export enum DiscordColor {
  Chat = 5_765_362, // #5865F2
  Command = 15_548_314, // #EB459E
  Death = 15_548_997, // #ED4245
  Join = 5_763_719, // #57F287
  Leave = 16_704_348, // #FEE75C
  Notify = 3_447_003, // #3498DB
}

type DiscordMessage = DiscordEmbedMessage | DiscordImageMessage;

export const discordMessageBuilders: MessageBuilders<DiscordMessage> = {
  async buildChatMessage(payload, chatSyncConfig, serverName) {
    return {
      embed: {
        author: { name: payload.playerName },
        color: DiscordColor.Chat,
        description: formatMCToPlatformMessage(
          chatSyncConfig.mcToPlatformTemplate,
          { ...payload, serverName },
        ),
        timestamp: new Date(payload.timestamp).toISOString(),
      },
      type: "embed",
    };
  },

  async buildCommandMessage(payload, commandConfig, log) {
    const text = `指令执行${payload.success ? "成功" : "失败"}：\n${payload.message}`;
    if (commandConfig.imageRender) {
      try {
        const buf = await renderMinecraftTextToImage(text);
        return { content: h.image(toPngDataUri(buf)), type: "image" };
      } catch (error) {
        log.error(error, "渲染图片失败，降级为 embed");
      }
    }
    return {
      embed: { color: DiscordColor.Command, description: text },
      type: "embed",
    };
  },

  async buildDeathMessage(payload, notifyConfig) {
    return {
      embed: {
        author: { name: payload.playerName },
        color: DiscordColor.Death,
        description: renderDeathMessage(
          notifyConfig.death_notify_message,
          payload.playerName,
          payload.deathMessage ?? "未知原因",
        ),
      },
      type: "embed",
    };
  },

  async buildJoinMessage(payload, notifyConfig) {
    return {
      embed: {
        author: { name: payload.playerName },
        color: DiscordColor.Join,
        description: renderJoinMessage(
          notifyConfig.join_notify_message,
          payload.playerName,
        ),
      },
      type: "embed",
    };
  },

  async buildLeaveMessage(payload, notifyConfig) {
    return {
      embed: {
        author: { name: payload.playerName },
        color: DiscordColor.Leave,
        description: renderLeaveMessage(
          notifyConfig.leave_notify_message,
          payload.playerName,
        ),
      },
      type: "embed",
    };
  },

  async buildNotifyMessage(payload) {
    return {
      embed: { color: DiscordColor.Notify, description: payload.message },
      type: "embed",
    };
  },

  async buildTemplateMessage(payload) {
    if (payload.success) {
      return { content: h.image(toPngDataUri(payload.image)), type: "image" };
    }
    return {
      embed: {
        color: DiscordColor.Notify,
        description: `模板渲染失败：${payload.error}`,
      },
      type: "embed",
    };
  },
};
