import type z from "zod";

type ValidationRule = {
    required: boolean;
    trigger: string;
    validator: (rule: unknown, value: unknown) => boolean | Error;
};

export function zodToNaiveRules<T extends z.ZodRawShape>(schema: z.ZodObject<T>): Record<string, ValidationRule[]> {
    const shape = schema.shape;
    const rules: Record<string, ValidationRule[]> = {};

    for (const key in shape) {
        const fieldSchema = shape[key] as z.ZodTypeAny;
        if (!fieldSchema) continue;

        const isOptional = fieldSchema.safeParse(undefined).success;

        rules[key] = [
            {
                required: !isOptional,
                trigger: "blur",
                validator: (_rule: unknown, value: unknown) => {
                    const result = fieldSchema.safeParse(value);
                    return result.success ? true : new Error(result.error.issues[0]?.message || "格式错误");
                }
            }
        ];
    }

    return rules;
}
