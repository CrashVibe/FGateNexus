import type { DiscordBot } from "@koishijs/plugin-adapter-discord";
import { h } from "koishi";
import type { Element } from "koishi";
import type { Target } from "~~/server/db/schema";
import type { MCEvent } from "~~/server/service/mcwsbridge/types";

import type { PlatformMessage } from "#server/service/chatbridge/sender/types";
import {
  renderDeathMessage,
  renderJoinMessage,
  renderLeaveMessage,
} from "#shared/utils/template/notify";

import { BaseSender } from "./base";

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
}

export default class DiscordSender extends BaseSender<
  DiscordBot,
  DiscordEmbedMessage | DiscordImageMessage
> {
  protected override async buildChatMessage(
    payload: MCEvent<"player.chat">["payload"],
    server: Awaited<ReturnType<typeof BaseSender.getServer>>,
  ): Promise<DiscordEmbedMessage> {
    return {
      embed: {
        author: { name: payload.playerName },
        color: DiscordColor.Chat,
        description: formatMCToPlatformMessage(
          server.chatSyncConfig.mcToPlatformTemplate,
          {
            ...payload,
            serverName: server.name,
          },
        ),
        timestamp: new Date(payload.timestamp).toISOString(),
      },
      type: "embed",
    };
  }

  protected override async buildDeathMessage(
    payload: MCEvent<"player.death">["payload"],
    server: Awaited<ReturnType<typeof BaseSender.getServer>>,
  ): Promise<DiscordEmbedMessage> {
    return {
      embed: {
        author: { name: payload.playerName },
        color: DiscordColor.Death,
        description: renderDeathMessage(
          server.notifyConfig.death_notify_message,
          payload.playerName,
          payload.deathMessage ?? "未知原因",
        ),
      },
      type: "embed",
    };
  }

  protected override async buildJoinMessage(
    payload: MCEvent<"player.join">["payload"],
    server: Awaited<ReturnType<typeof BaseSender.getServer>>,
  ): Promise<DiscordEmbedMessage> {
    return {
      embed: {
        author: { name: payload.playerName },
        color: DiscordColor.Join,
        description: renderJoinMessage(
          server.notifyConfig.join_notify_message,
          payload.playerName,
        ),
      },
      type: "embed",
    };
  }
  protected override async buildLeaveMessage(
    payload: MCEvent<"player.leave">["payload"],
    server: Awaited<ReturnType<typeof BaseSender.getServer>>,
  ): Promise<DiscordEmbedMessage> {
    return {
      embed: {
        author: { name: payload.playerName },
        color: DiscordColor.Leave,
        description: renderLeaveMessage(
          server.notifyConfig.leave_notify_message,
          payload.playerName,
        ),
      },
      type: "embed",
    };
  }

  protected async buildCommandMessage(
    payload: MCEvent<"execute.command">["payload"],
    server: Awaited<ReturnType<typeof BaseSender.getServer>>,
  ): Promise<DiscordEmbedMessage | DiscordImageMessage> {
    const text = `指令执行${payload.success ? "成功" : "失败"}：\n${payload.message}`;
    if (server.commandConfig.imageRender) {
      try {
        const buf = await renderMinecraftTextToImage(text);
        return {
          content: h.image(`data:image/png;base64,${buf.toString("base64")}`),
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
