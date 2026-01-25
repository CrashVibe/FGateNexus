import type { z } from "zod";

export function applyDefaults<T>(schema: z.ZodType<T>, config: Partial<T>): T {
  return schema.parse(config);
}
