import type { TemplateInstanceConfig } from "#shared/model/template/schema/instance";
import type { TemplateDataSource } from "#shared/model/template/schema/manifest";

/** 合并后截断上限 */
const PLACEHOLDERS_HARD_CAP = 20;

const extractPlaceholderIds = (value: unknown): string[] => {
  if (!Array.isArray(value)) {
    return [];
  }
  return value
    .map((entry) =>
      typeof entry === "object" && entry !== null && "placeholder" in entry
        ? String((entry as { placeholder: unknown }).placeholder)
        : null,
    )
    .filter((p): p is string => p !== null);
};

/** 静态 placeholders + placeholdersFrom 去重合并 */
export const resolvePlaceholderIds = (
  ds: Extract<TemplateDataSource, { type: "placeholder" }>,
  config: TemplateInstanceConfig | undefined,
): string[] => {
  const dynamic = ds.placeholdersFrom
    ? extractPlaceholderIds(config?.[ds.placeholdersFrom])
    : [];
  return [...new Set([...ds.placeholders, ...dynamic])].slice(
    0,
    PLACEHOLDERS_HARD_CAP,
  );
};
