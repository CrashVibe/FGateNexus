import { z } from "zod";

import { LastEventSchema } from "#shared/model/status";

import { PlatformType } from "../types";
import { DiscordConfigSchema } from "./discord";
import { KookConfigSchema } from "./kook";
import { MilkyConfigSchema } from "./milky";
import { OneBotConfigSchema } from "./onebot";

export const PlatformSchema = z.union([
  OneBotConfigSchema,
  DiscordConfigSchema,
  KookConfigSchema,
  MilkyConfigSchema,
]);

export const PlatformResponseSchema = z.object({
  config: PlatformSchema,
  enabled: z.boolean(),
  id: z.number(),
  isOnline: z.boolean(),
  lastEvent: LastEventSchema.nullish(),
  name: z.string(),
  platform: z.enum(PlatformType),
});
