import en from "#shared/locales/en.json";

// ponytail: 中文原文即 key，英文查表，缺翻译就回落中文；切语言直接刷新页面，
// 所以模块级常量也能用 t()。要复数/ICU 再换 i18next。
export type Lang = "en" | "zh";

const STORAGE_KEY = "fgate-lang";

const detect = (): Lang => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === "en" || saved === "zh") {
      return saved;
    }
  } catch {
    // 隐私模式等读不到存储
  }
  return navigator.language.toLowerCase().startsWith("zh") ? "zh" : "en";
};

export const lang: Lang = detect();

const table: Record<string, string> = lang === "en" ? en : {};

/** 翻译；`{{name}}` 占位用 vars 填 */
export const t = (
  key: string,
  vars?: Record<string, string | number | null | undefined>,
): string => {
  const text = table[key] ?? key;
  return vars
    ? text.replaceAll(/\{\{(?<name>\w+)\}\}/gu, (_, k: string) =>
        String(vars[k] ?? ""),
      )
    : text;
};

export const setLang = (next: Lang): void => {
  try {
    localStorage.setItem(STORAGE_KEY, next);
  } catch {
    // 存不了就只切这一次
  }
  location.reload();
};
