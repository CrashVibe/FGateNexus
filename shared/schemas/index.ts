import type { ZodType } from "zod";

export type ApiSchemaRegistry = Partial<
  Record<
    string,
    {
      description?: string;
      request: ZodType;
      response: ZodType;
    }
  >
>;
