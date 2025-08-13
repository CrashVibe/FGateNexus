import { OneBotConfigSchema, type OneBotConfig } from "./onebot";
import type { adapters } from "~~/server/db/schema";

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
}

export enum AdapterType {
    Onebot = "onebot"
}
