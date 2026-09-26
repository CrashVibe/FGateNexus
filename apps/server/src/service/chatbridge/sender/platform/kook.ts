import type { KookBot } from "@koishijs/plugin-adapter-kook";
import type { ForkScope } from "koishi";
import pLimit from "p-limit";

import type { Target } from "#server/db/schema";
import type { PlatformConfig, PlatformType } from "#shared/model/bot/types";

import type { GroupedChannels, RoleList } from "../types";
import { BaseSender } from "./base";
import type { ElementTextMessage } from "./element-message";
import { elementMessageBuilders } from "./element-message";

const TEXT_CHANNEL_TYPE = 0;
const CHANNEL_FETCH_CONCURRENCY = 5;

export default class KookSender extends BaseSender<
  KookBot,
  ElementTextMessage
> {
  constructor(
    platformType: PlatformType,
    botId: number,
    config: PlatformConfig,
    bot: KookBot,
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
    await this.bot.sendMessage(target.channelId, message.message);
  }

  override async setGroupCard(
    target: Target,
    userId: string,
    card: string,
  ): Promise<void> {
    if (!target.guildId) {
      throw new Error("缺少 guildId，无法修改群名片");
    }
    await this.bot.setGroupNickname(target.guildId, userId, card);
  }

  override async listChannels(): Promise<GroupedChannels> {
    return await this.cached("channels", async () => {
      const { data: guilds } = await this.bot.getGuildList();
      const limit = pLimit(CHANNEL_FETCH_CONCURRENCY);
      const perGuild = await Promise.all(
        guilds.map(
          async (guild) =>
            await limit(async () => {
              const { data } = await this.bot.getChannelList(guild.id);
              return data
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
          avatar: g.avatar,
          id: g.id,
          name: g.name ?? `服务器 ${g.id}`,
        })),
      };
    });
  }

  async listRoles(guildId: string): Promise<RoleList> {
    return await this.cached(`roles:${guildId}`, async () => {
      const { data } = await this.bot.getGuildRoles(guildId);
      return data.map((r) => ({ label: r.name ?? r.id, value: r.id }));
    });
  }
}
