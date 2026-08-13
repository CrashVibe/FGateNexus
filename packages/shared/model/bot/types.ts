import type { DiscordConfig } from "#shared/model/bot/schema/discord";
import type { KookConfig } from "#shared/model/bot/schema/kook";
import type { MilkyConfig } from "#shared/model/bot/schema/milky";
import type { OneBotConfig } from "#shared/model/bot/schema/onebot";

export type PlatformConfig =
  | OneBotConfig
  | DiscordConfig
  | KookConfig
  | MilkyConfig;

export enum PlatformType {
  Onebot = "onebot",
  Discord = "discord",
  Kook = "kook",
  Milky = "milky",
}

const platformTypeSet = new Set<string>(Object.values(PlatformType));

export const isPlatformType = (value: string): value is PlatformType =>
  platformTypeSet.has(value);
