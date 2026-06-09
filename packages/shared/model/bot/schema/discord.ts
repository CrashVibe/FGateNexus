import { z } from "zod";

export const DiscordConfigSchema = z.object({
  token: z.string().nonempty("不能为空"),
});

export type DiscordConfig = z.infer<typeof DiscordConfigSchema>;
