import type { DiscordConfig } from "#shared/model/bot/schema/discord";
import type { OneBotConfig } from "#shared/model/bot/schema/onebot";

export type PlatformConfig = OneBotConfig | DiscordConfig;

export enum PlatformType {
  Onebot = "onebot",
  Discord = "discord",
}
