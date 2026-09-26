import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";

import type { BotAPI } from "#shared/model/bot/api";
import { PlatformType } from "#shared/model/bot/types";
import { TransferList } from "@/components/target/transfer-list";
import type { TransferItem } from "@/components/target/transfer-list";
import { t } from "@/i18n";
import { BotData } from "@/lib/api";
import { errorMessage } from "@/lib/http";

type OnebotChannels = Awaited<
  ReturnType<typeof BotAPI.ONEBOT_CHANNELS.response.parse>
>;
type DiscordChannels = Awaited<
  ReturnType<typeof BotAPI.DISCORD_CHANNELS.response.parse>
>;

const buildOnebotItems = (channels: OnebotChannels): TransferItem[] =>
  channels.map((channel) => ({
    avatar: channel.avatar,
    description: `${channel.type === "group" ? t("群聊") : t("私聊")} · ${channel.id}`,
    label: channel.name,
    value: `${channel.type}|${channel.type === "group" ? channel.id : ""}|${channel.id}`,
  }));

const buildDiscordItems = (data: DiscordChannels): TransferItem[] => {
  const guildNames = new Map(data.guilds.map((g) => [g.id, g.name]));
  const channelItems = data.channels.map((channel) => ({
    avatar: channel.avatar,
    description: `${guildNames.get(channel.guildId ?? "") ?? channel.guildId ?? t("未知服务器")} · ${channel.id}`,
    label: channel.name,
    value: `group|${channel.guildId ?? ""}|${channel.id}`,
  }));
  const dmItems = data.dms.map((dm) => ({
    avatar: dm.avatar,
    description: t("私聊 · {{id}}", { id: dm.id }),
    label: dm.name,
    value: `private||${dm.id}`,
  }));
  return [...channelItems, ...dmItems];
};

/** Bot 能看到的群聊/频道列表，与选择器共享缓存。value 即 `type|guildId|channelId`。 */
export const useChannelItems = (
  botId: number | undefined,
  platform: PlatformType | undefined,
  enabled = true,
) => {
  const query = useQuery({
    enabled: enabled && botId !== undefined && platform !== undefined,
    queryFn: async () => await BotData.getChannels(botId!, platform!),
    queryKey: ["channels", botId, platform],
  });
  const buildItems = (): TransferItem[] => {
    if (query.data === undefined) {
      return [];
    }
    if (platform === PlatformType.Onebot || platform === PlatformType.Milky) {
      return buildOnebotItems(query.data as OnebotChannels);
    }
    return buildDiscordItems(query.data as DiscordChannels);
  };
  return { items: buildItems(), query };
};

/** 目标频道选择器。 */
export const ChannelSelector = ({
  botId,
  platform,
  selected,
  onChange,
  onLoadingChange,
}: {
  botId: number;
  platform: PlatformType;
  selected: Set<string>;
  onChange: (next: Set<string>) => void;
  onLoadingChange?: (loading: boolean) => void;
}) => {
  const { items, query } = useChannelItems(botId, platform);

  useEffect(() => {
    onLoadingChange?.(query.isFetching);
  }, [query.isFetching, onLoadingChange]);

  return (
    <TransferList
      error={query.isError ? errorMessage(query.error) : null}
      items={items}
      loading={query.isFetching}
      onChange={onChange}
      onReload={() => {
        void query.refetch();
      }}
      selected={selected}
    />
  );
};
