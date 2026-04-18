// Response model
import { z } from "zod";

export const clientInfoSchema = z.object({
  minecraft_software: z.string(),
  minecraft_version: z.string(),
  player_count: z.number(),
  supports_command: z.boolean(),
  supports_papi: z.boolean(),
});
export const kickPlayerSchema = z.object({
  message: z.string(),
  success: z.boolean(),
});
export const executeCommandSchema = z.object({
  message: z.string(),
  success: z.boolean(),
});
