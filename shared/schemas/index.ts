import type { ZodSchema } from "zod";

export type AllApi = Record<
  string,
  {
    description?: string;
    request: ZodSchema;
    response: ZodSchema;
  }
>;
