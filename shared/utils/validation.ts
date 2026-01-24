import type z from "zod";

type ValidationRule = {
    required: boolean;
    trigger: string;
    validator: (rule: unknown, value: unknown) => boolean | Error;
};

export function zodToNaiveRules<T extends z.ZodRawShape>(schema: z.ZodObject<T>): Record<string, ValidationRule[]> {
    const { shape } = schema;
    const rules: Record<string, ValidationRule[]> = {};

    for (const key in shape) {
        const fieldSchema = shape[key] as unknown as z.ZodTypeAny;
        if (!fieldSchema) continue;

        const typeName = fieldSchema.def?.type;
        const isOptional = typeName === "optional" || typeName === "nullable";

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

export function zodUnionToNaiveRules<T extends readonly [z.ZodTypeAny, ...z.ZodTypeAny[]]>(
    unionSchema: z.ZodUnion<T>,
    _discriminator: (data: unknown) => number
): Record<string, ValidationRule[]> {
    return {
        _union: [
            {
                required: true,
                trigger: "blur",
                validator: (_rule: unknown, value: unknown) => {
                    const result = unionSchema.safeParse(value);
                    return result.success ? true : new Error(result.error.issues[0]?.message || "格式错误");
                }
            }
        ]
    };
}

export function createDynamicZodRules(
    getSchema: () => z.ZodObject<z.ZodRawShape> | null
): () => Record<string, ValidationRule[]> {
    return () => {
        const schema = getSchema();
        return schema ? zodToNaiveRules(schema) : {};
    };
}
