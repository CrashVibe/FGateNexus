import { useTheme } from "tanstack-theme-kit";

/** 实际生效的明暗：theme 为 system 时取系统偏好 */
export const useResolvedTheme = (): "dark" | "light" => {
  const { theme, systemTheme } = useTheme();
  const active = theme === "system" ? systemTheme : theme;
  return active === "light" ? "light" : "dark";
};
