import { z } from "zod";

import { PlatformType } from "../types";
import { DiscordConfigSchema } from "./discord";
import { OneBotConfigSchema } from "./onebot";

export const PlatformSchema = z.union([
  OneBotConfigSchema,
  DiscordConfigSchema,
]);

export const PlatformResponseSchema = z.object({
  config: PlatformSchema,
  enabled: z.boolean(),
  id: z.number(),
  isOnline: z.boolean(),
  name: z.string(),
  platform: z.enum(PlatformType),
});
