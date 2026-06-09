import { useSyncExternalStore } from "react";

/** 主题状态(深色优先)。读写 `documentElement` 的 `dark` 类并持久化到 localStorage。 */
type Theme = "dark" | "light";

const STORAGE_KEY = "fgate-theme";

const getTheme = (): Theme =>
  document.documentElement.classList.contains("dark") ? "dark" : "light";

const listeners = new Set<() => void>();

const subscribe = (listener: () => void): (() => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

const applyTheme = (theme: Theme): void => {
  document.documentElement.classList.toggle("dark", theme === "dark");
  localStorage.setItem(STORAGE_KEY, theme);
  for (const listener of listeners) {
    listener();
  }
};

export const initTheme = (): void => {
  const saved = localStorage.getItem(STORAGE_KEY);
  // 默认深色(index.html 已带 dark 类),仅当用户曾切换为 light 时移除。
  if (saved === "light") {
    document.documentElement.classList.remove("dark");
  }
};

export const useTheme = (): { theme: Theme; toggle: () => void } => {
  const theme = useSyncExternalStore(subscribe, getTheme, (): Theme => "dark");
  return {
    theme,
    toggle: () => {
      applyTheme(theme === "dark" ? "light" : "dark");
    },
  };
};
