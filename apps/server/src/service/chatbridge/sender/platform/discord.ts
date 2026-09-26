import { setTimeout as sleep } from "node:timers/promises";

import type { DiscordBot } from "@koishijs/plugin-adapter-discord";
import type { ForkScope } from "koishi";
import pLimit from "p-limit";
import pRetry from "p-retry";

import type { Target } from "#server/db/schema";
import type { PlatformConfig, PlatformType } from "#shared/model/bot/types";

import type { GroupedChannels, RoleList } from "../types";
import { BaseSender } from "./base";
import { discordMessageBuilders } from "./discord-message";
import type {
  DiscordEmbedMessage,
  DiscordImageMessage,
} from "./discord-message";

export { DiscordColor } from "./discord-message";

const TEXT_CHANNEL_TYPE = 0;
const GUILD_PAGE_SIZE = 200;
const CHANNEL_FETCH_CONCURRENCY = 5;

type DiscordMessage = DiscordEmbedMessage | DiscordImageMessage;

export default class DiscordSender extends BaseSender<
  DiscordBot,
  DiscordMessage
> {
  constructor(
    platformType: PlatformType,
    botId: number,
    config: PlatformConfig,
    bot: DiscordBot,
    pluginInstance: ForkScope,
  ) {
    super(
      platformType,
      botId,
      config,
      bot,
      pluginInstance,
      discordMessageBuilders,
    );
  }

  protected override async send(
    target: Target,
    message: DiscordMessage,
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

  override async listChannels(): Promise<GroupedChannels> {
    return await this.cached("channels", async () => {
      const guilds = await this.collectGuilds();
      const limit = pLimit(CHANNEL_FETCH_CONCURRENCY);
      const perGuild = await Promise.all(
        guilds.map(
          async (guild) =>
            await limit(async () => {
              const list = await pRetry(
                async () => await this.bot.internal.getGuildChannels(guild.id),
                { retries: 3 },
              );
              return list
                .filter((ch) => ch.type === TEXT_CHANNEL_TYPE)
                .map((ch) => ({
                  guildId: guild.id,
                  id: ch.id,
                  name: ch.name ?? `频道 ${ch.id}`,
                  type: "group" as const,
                }));
            }),
        ),
      );
      return {
        channels: perGuild.flat(),
        dms: [],
        guilds: guilds.map((g) => ({
          avatar: g.icon
            ? `https://cdn.discordapp.com/icons/${g.id}/${g.icon}.png`
            : undefined,
          id: g.id,
          name: g.name ?? `服务器 ${g.id}`,
        })),
      };
    });
  }

  async listRoles(guildId: string): Promise<RoleList> {
    return await this.cached(`roles:${guildId}`, async () => {
      const roles = await this.bot.internal.getGuildRoles(guildId);
      return roles.map((r) => ({ label: r.name, value: r.id }));
    });
  }

  private async collectGuilds(
    after?: string,
  ): Promise<
    Awaited<ReturnType<DiscordBot["internal"]["getCurrentUserGuilds"]>>
  > {
    const page = await pRetry(
      async () =>
        await this.bot.internal.getCurrentUserGuilds({
          after,
          limit: GUILD_PAGE_SIZE,
        }),
      { retries: 3 },
    );
    if (page.length < GUILD_PAGE_SIZE) {
      return page;
    }
    // 分页限速
    await sleep(200);
    return [...page, ...(await this.collectGuilds(page.at(-1)?.id))];
  }
}
