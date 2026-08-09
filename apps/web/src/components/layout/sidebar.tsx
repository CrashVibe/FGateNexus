import { Link, useLocation } from "@tanstack/react-router";
import { ChevronRight, LogOut, Moon, Sun } from "lucide-react";
import { useTheme } from "tanstack-theme-kit";

import { AppLogo } from "@/components/common/app-logo";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import type { MenuColumn, MenuNode } from "@/lib/menu";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/stores/auth";

const leafClass =
  "flex items-center gap-2.5 rounded-md px-3.5 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground";
const leafActiveClass = "bg-accent text-accent-foreground";

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
  // 含子区块的项：所在子区块随便切都算"在这一项里"；否则要求精确匹配
  const isActive = node.hasSections
    ? pathname.startsWith(node.to.split("/").slice(0, -1).join("/"))
    : pathname === node.to;
  const Icon = node.icon;
  return (
    <Link
      className={cn(leafClass, isActive && leafActiveClass)}
      onClick={onNavigate}
      to={node.to}
    >
      {Icon ? <Icon className="size-[18px] shrink-0" /> : null}
      <span className="min-w-0 flex-1 truncate">{node.label}</span>
      {node.hasSections ? (
        <ChevronRight className="size-3.5 shrink-0 opacity-50" />
      ) : null}
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
        className="border-sidebar-border flex h-16 shrink-0 items-center gap-2.5 border-b px-5"
        onClick={onNavigate}
        to="/"
      >
        <AppLogo className="h-7 w-auto shrink-0" />
        <span className="text-base font-semibold">FlowGate</span>
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

      <div
        className={cn(
          "border-sidebar-border flex items-center justify-between border-t p-4",
        )}
      >
        <Button
          aria-label="切换主题"
          onClick={() => {
            setTheme(theme === "dark" ? "light" : "dark");
          }}
          size="icon"
          variant="ghost"
        >
          {theme === "dark" ? <Sun /> : <Moon />}
        </Button>
        {hasPassword ? (
          <Button
            aria-label="退出登录"
            onClick={() => {
              void handleLogout();
            }}
            size="sm"
            variant="ghost"
          >
            <LogOut />
          </Button>
        ) : null}
      </div>
    </div>
  );
};
