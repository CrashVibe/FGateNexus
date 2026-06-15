import { z } from "zod";

import { PlaceholderListEntrySchema } from "#shared/model/template/schema/manifest";
import type {
  PlaceholderListEntry,
  TemplateConfigField,
} from "#shared/model/template/schema/manifest";

const PLACEHOLDERS_MAX = 20;

/** 路由层转 400 */
export class ConfigValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ConfigValidationError";
  }
}

type Field<T extends TemplateConfigField["type"]> = Extract<
  TemplateConfigField,
  { type: T }
>;

const validateNumber = (field: Field<"number">, value: unknown): number => {
  if (typeof value !== "number" || Number.isNaN(value)) {
    throw new ConfigValidationError(`配置项 ${field.key} 必须是数字`);
  }
  if (field.min !== undefined && value < field.min) {
    throw new ConfigValidationError(
      `配置项 ${field.key} 不能小于 ${field.min}`,
    );
  }
  if (field.max !== undefined && value > field.max) {
    throw new ConfigValidationError(
      `配置项 ${field.key} 不能大于 ${field.max}`,
    );
  }
  return value;
};

const validateString = (field: Field<"string">, value: unknown): string => {
  if (typeof value !== "string") {
    throw new ConfigValidationError(`配置项 ${field.key} 必须是字符串`);
  }
  if (field.maxLength !== undefined && value.length > field.maxLength) {
    throw new ConfigValidationError(
      `配置项 ${field.key} 长度不能超过 ${field.maxLength}`,
    );
  }
  return value;
};

const validateText = (
  field: Field<"color"> | Field<"placeholder">,
  value: unknown,
): string => {
  if (typeof value !== "string") {
    throw new ConfigValidationError(`配置项 ${field.key} 必须是字符串`);
  }
  return value;
};

const validateSelect = (field: Field<"select">, value: unknown): string => {
  if (
    typeof value !== "string" ||
    !field.options.some((o) => o.value === value)
  ) {
    throw new ConfigValidationError(`配置项 ${field.key} 不是合法选项`);
  }
  return value;
};

const validateBoolean = (field: Field<"boolean">, value: unknown): boolean => {
  if (typeof value !== "boolean") {
    throw new ConfigValidationError(`配置项 ${field.key} 必须是布尔值`);
  }
  return value;
};

const validatePlaceholders = (
  field: Field<"placeholders">,
  value: unknown,
): PlaceholderListEntry[] => {
  const max = Math.min(field.max ?? PLACEHOLDERS_MAX, PLACEHOLDERS_MAX);
  const parsed = z.array(PlaceholderListEntrySchema).max(max).safeParse(value);
  if (!parsed.success) {
    throw new ConfigValidationError(
      `配置项 ${field.key} 格式不正确（每项需含 label/placeholder，最多 ${max} 项）`,
    );
  }
  return parsed.data;
};

const validateField = (
  field: TemplateConfigField,
  value: unknown,
): string | number | boolean | PlaceholderListEntry[] => {
  switch (field.type) {
    case "number": {
      return validateNumber(field, value);
    }
    case "boolean": {
      return validateBoolean(field, value);
    }
    case "select": {
      return validateSelect(field, value);
    }
    case "string": {
      return validateString(field, value);
    }
    case "color":
    case "placeholder": {
      return validateText(field, value);
    }
    case "placeholders": {
      return validatePlaceholders(field, value);
    }
    default: {
      throw new ConfigValidationError("未知配置项类型");
    }
  }
};

/** 多余 key 丢弃，缺省值补全 */
export const validateInstanceConfig = (
  fields: TemplateConfigField[],
  values: Record<string, unknown>,
): Record<string, string | number | boolean | PlaceholderListEntry[]> => {
  const result: Record<
    string,
    string | number | boolean | PlaceholderListEntry[]
  > = {};
  for (const field of fields) {
    const value = values[field.key] ?? field.default;
    if (value === undefined) {
      continue;
    }
    result[field.key] = validateField(field, value);
  }
  return result;
};
