import type { DiscordBot } from "@koishijs/plugin-adapter-discord";
import { h } from "koishi";
import type { Element } from "koishi";

import type { Target } from "#server/db/schema";
import type { PlatformMessage } from "#server/service/chatbridge/sender/types";
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

import { BaseSender, toPngDataUri } from "./base";

interface DiscordEmbedMessage extends PlatformMessage {
  type: "embed";
  embed: {
    description: string;
    color: number;
    author?: { name: string; icon_url?: string };
    timestamp?: string;
  };
}

interface DiscordImageMessage extends PlatformMessage {
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

export default class DiscordSender extends BaseSender<
  DiscordBot,
  DiscordEmbedMessage | DiscordImageMessage
> {
  protected override async buildChatMessage(
    payload: MCEvent<"player.chat">["payload"],
    chatSyncConfig: ChatSyncConfig,
    serverName: string,
  ): Promise<DiscordEmbedMessage> {
    return {
      embed: {
        author: { name: payload.playerName },
        color: DiscordColor.Chat,
        description: formatMCToPlatformMessage(
          chatSyncConfig.mcToPlatformTemplate,
          {
            ...payload,
            serverName,
          },
        ),
        timestamp: new Date(payload.timestamp).toISOString(),
      },
      type: "embed",
    };
  }

  protected override async buildDeathMessage(
    payload: MCEvent<"player.death">["payload"],
    notifyConfig: NotifyConfig,
  ): Promise<DiscordEmbedMessage> {
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
  }

  protected override async buildJoinMessage(
    payload: MCEvent<"player.join">["payload"],
    notifyConfig: NotifyConfig,
  ): Promise<DiscordEmbedMessage> {
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
  }
  protected override async buildLeaveMessage(
    payload: MCEvent<"player.leave">["payload"],
    notifyConfig: NotifyConfig,
  ): Promise<DiscordEmbedMessage> {
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
  }

  protected async buildCommandMessage(
    payload: MCEvent<"execute.command">["payload"],
    commandConfig: CommandConfig,
  ): Promise<DiscordEmbedMessage | DiscordImageMessage> {
    const text = `指令执行${payload.success ? "成功" : "失败"}：\n${payload.message}`;
    if (commandConfig.imageRender) {
      try {
        const buf = await renderMinecraftTextToImage(text);
        return {
          content: h.image(toPngDataUri(buf)),
          type: "image",
        };
      } catch (error) {
        this.logger.error(error, "渲染图片失败，降级为 embed");
      }
    }
    return {
      embed: {
        color: DiscordColor.Command,
        description: text,
      },
      type: "embed",
    };
  }

  protected override async buildNotifyMessage(
    payload: MCEvent<"system.notify">["payload"],
  ): Promise<DiscordEmbedMessage> {
    return {
      embed: { color: DiscordColor.Notify, description: payload.message },
      type: "embed",
    };
  }

  protected override async buildTemplateMessage(
    payload: MCEvent<"system.template">["payload"],
  ): Promise<DiscordEmbedMessage | DiscordImageMessage> {
    if (payload.success) {
      return {
        content: h.image(toPngDataUri(payload.image)),
        type: "image",
      };
    }
    return {
      embed: {
        color: DiscordColor.Notify,
        description: `模板渲染失败：${payload.error}`,
      },
      type: "embed",
    };
  }

  protected async send(
    target: Target,
    message: DiscordEmbedMessage | DiscordImageMessage,
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
