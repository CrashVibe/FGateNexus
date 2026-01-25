import type { adapters } from "~~/server/db/schema";

import { type OneBotConfig, OneBotConfigSchema } from "./onebot";

export const AdapterConfigSchema = OneBotConfigSchema;

export type AdapterConfig = OneBotConfig;

export type AdapterSchema = typeof adapters.$inferSelect;
export type AdapterWithStatus = AdapterSchema & {
  isOnline: boolean;
};

export interface BotInstanceData {
  adapterType: AdapterType | null;
  config: AdapterConfig | null;
  adapterID: number | null;
  name?: string;
}

export enum AdapterType {
  Onebot = "onebot"
}
