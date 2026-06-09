import type { z } from "zod";

export const applyDefaults = <T>(schema: z.ZodType<T>, config: Partial<T>): T =>
  schema.parse(config);
