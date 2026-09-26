import { Link, useLocation } from "@tanstack/react-router";
import { LogOut, Monitor, Moon, Sun } from "lucide-react";
import { useTheme } from "tanstack-theme-kit";

import { AppLogo } from "@/components/common/app-logo";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { lang, setLang, t } from "@/i18n";
import type { MenuColumn, MenuNode } from "@/lib/menu";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/stores/auth";

// 跟随系统 → 浅色 → 深色 → 跟随系统
const NEXT_THEME: Record<string, string> = {
  dark: "system",
  light: "dark",
  system: "light",
};

// hover / 当前页 / 按下分别取 gray-100 / 200 / 300。
const leafClass = [
  "flex h-9 items-center gap-2.5 rounded-md px-3 text-sm font-medium",
  "text-muted-foreground",
  "hover:bg-gray-100 hover:text-foreground active:bg-gray-300",
  "focus-visible:outline-2 focus-visible:outline-offset-2",
].join(" ");
const leafActiveClass = "bg-gray-200 text-foreground";

const NavLeaf = ({
  node,
  onNavigate,
}: {
  node: MenuNode;
  onNavigate?: () => void;
}) => {
  const { pathname } = useLocation();
  if (!node.to) {
    return null;
  }
  const isActive = pathname === node.to;
  const Icon = node.icon;
  return (
    <Link
      className={cn(leafClass, isActive && leafActiveClass)}
      onClick={onNavigate}
      to={node.to}
    >
      {Icon ? <Icon className="size-[18px] shrink-0" /> : null}
      <span className="min-w-0 flex-1 truncate">{node.label}</span>
    </Link>
  );
};

const NavGroup = ({
  node,
  onNavigate,
}: {
  node: MenuNode;
  onNavigate?: () => void;
}) => {
  const Icon = node.icon;
  return (
    <div className="space-y-1">
      <div className="text-muted-foreground/70 flex items-center gap-2 px-3 pt-2 pb-1 text-xs font-semibold tracking-wide uppercase">
        {Icon ? <Icon className="size-3.5" /> : null}
        <span>{node.label}</span>
      </div>
      <div className="space-y-0.5 pl-2">
        {node.children?.map((child) => (
          <NavLeaf
            key={child.to ?? child.label}
            node={child}
            onNavigate={onNavigate}
          />
        ))}
      </div>
    </div>
  );
};

/** 侧边栏内容（桌面常驻 / 移动 Sheet 内复用）。 */
export const Sidebar = ({
  menu,
  onNavigate,
}: {
  menu: MenuColumn[];
  onNavigate?: () => void;
}) => {
  const { setTheme, theme } = useTheme();
  const hasPassword = useAuthStore((s) => s.authStatus.hasPassword);
  const logout = useAuthStore((s) => s.logout);

  const handleLogout = async (): Promise<void> => {
    await logout();
    window.location.href = "/login";
  };

  return (
    <div className="bg-sidebar text-sidebar-foreground flex h-full flex-col">
      <Link
        className="border-sidebar-border flex h-12 shrink-0 items-center gap-2.5 border-b px-5"
        onClick={onNavigate}
        to="/"
      >
        <AppLogo className="h-6 w-auto shrink-0" />
        <span className="text-sm font-semibold">FlowGate</span>
      </Link>

      <nav className="scrollbar-custom flex-1 space-y-3 overflow-y-auto px-3 py-4">
        {menu.map((column, i) => (
          <div className="space-y-1" key={column.map((n) => n.label).join("|")}>
            {i > 0 ? <Separator className="my-2" /> : null}
            {column.map((node) =>
              node.children ? (
                <NavGroup
                  key={node.label}
                  node={node}
                  onNavigate={onNavigate}
                />
              ) : (
                <NavLeaf
                  key={node.to ?? node.label}
                  node={node}
                  onNavigate={onNavigate}
                />
              ),
            )}
          </div>
        ))}
      </nav>

      <div className="border-sidebar-border flex h-12 shrink-0 items-center justify-between border-t px-3">
        <Button
          aria-label={t("切换主题")}
          onClick={() => {
            setTheme(NEXT_THEME[theme ?? "system"] ?? "system");
          }}
          className="size-8"
          size="icon"
          variant="ghost"
        >
          {theme === "light" ? <Sun /> : null}
          {theme === "dark" ? <Moon /> : null}
          {theme === "light" || theme === "dark" ? null : <Monitor />}
        </Button>
        <Button
          aria-label={t("切换语言")}
          className="h-8 px-2 text-xs"
          onClick={() => {
            setLang(lang === "zh" ? "en" : "zh");
          }}
          variant="ghost"
        >
          {lang === "zh" ? "EN" : "中文"}
        </Button>
        {hasPassword ? (
          <Button
            aria-label={t("退出登录")}
            onClick={() => {
              void handleLogout();
            }}
            className="size-8"
            size="icon"
            variant="ghost"
          >
            <LogOut />
          </Button>
        ) : null}
      </div>
    </div>
  );
};
