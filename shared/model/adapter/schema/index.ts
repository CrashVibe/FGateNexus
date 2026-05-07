import { z } from "zod";

import type { AdapterAPI } from "../api";
import type { OneBotConfig } from "./onebot";
import { OneBotConfigSchema } from "./onebot";

export type AdaptersWithStatus = z.infer<typeof AdapterAPI.GETS.response>;
export type AdapterWithStatus = z.infer<typeof AdapterAPI.GET.response>;
export type AdapterConfig = OneBotConfig;

export enum AdapterType {
  Onebot = "onebot",
}

export const AdapterResponseSchema = z.object({
  config: OneBotConfigSchema,
  enabled: z.boolean(),
  id: z.number(),
  isOnline: z.boolean(),
  name: z.string(),
  type: z.enum(AdapterType),
});
