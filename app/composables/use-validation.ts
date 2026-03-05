import type { z } from "zod";

interface ValidationRule {
  required: boolean;
  trigger: string;
  validator: (rule: unknown, value: unknown) => boolean | Error;
}

export const zodToNaiveRules = <T extends z.ZodRawShape>(
  schema: z.ZodObject<T>,
): Record<string, ValidationRule[]> => {
  const rawShape: z.ZodRawShape = schema.shape;
  const rules: Record<string, ValidationRule[]> = {};

  for (const [key, fieldSchema] of Object.entries(rawShape)) {
    const typeName = fieldSchema._zod.def.type;
    const isOptional = typeName === "optional" || typeName === "nullable";

    rules[key] = [
      {
        required: !isOptional,
        trigger: "blur",
        validator: (_rule: unknown, value: unknown) => {
          const result = fieldSchema["~standard"].validate(value);
          if (result instanceof Promise) {
            return true;
          }
          if (!result.issues) {
            return true;
          }
          return new Error(result.issues[0]?.message ?? "格式错误");
        },
      },
    ];
  }
  return rules;
};

export const createDynamicZodRules =
  (
    getSchema: () => z.ZodObject<z.ZodRawShape> | null,
  ): (() => Record<string, ValidationRule[]>) =>
  () => {
    const schema = getSchema();
    return schema ? zodToNaiveRules(schema) : {};
  };
