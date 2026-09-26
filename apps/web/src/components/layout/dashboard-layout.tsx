import { Outlet, useLocation } from "@tanstack/react-router";
import { useMemo, useState } from "react";

import { LayoutContext } from "@/components/layout/context";
import { Sidebar } from "@/components/layout/sidebar";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { useDragResize } from "@/hooks/use-drag-resize";
import { t } from "@/i18n";
import { basicMenu, serverMenu } from "@/lib/menu";

/** Dashboard 布局：侧边菜单（随服务器编辑态切换）。 */
export const DashboardLayout = () => {
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  const sid = useMemo(() => {
    const match = /^\/servers\/(?<serverId>[^/]+)/u.exec(location.pathname);
    return match?.[1];
  }, [location.pathname]);

  const menu = useMemo(() => (sid ? serverMenu(sid) : basicMenu()), [sid]);

  const [sidebarWidth, startSidebarResize] = useDragResize(268, 200, 420);

  return (
    <LayoutContext.Provider
      value={{
        menu,
        openMobileSidebar: () => {
          setMobileOpen(true);
        },
      }}
    >
      <div className="flex h-screen w-full overflow-hidden">
        <aside
          className="border-border relative hidden shrink-0 border-r lg:block"
          style={{ width: sidebarWidth }}
        >
          <Sidebar menu={menu} />
          <button
            type="button"
            className="group absolute inset-y-0 -right-1 z-10 w-2 cursor-col-resize border-0 bg-transparent p-0"
            aria-label="Resize sidebar"
            onMouseDown={startSidebarResize}
          >
            <div className="absolute top-1/2 left-1/2 h-10 w-[3px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-transparent transition-colors group-hover:bg-white/50" />
          </button>
        </aside>

        <Sheet onOpenChange={setMobileOpen} open={mobileOpen}>
          <SheetContent className="w-64 p-0" side="left">
            <SheetTitle className="sr-only">{t("导航菜单")}</SheetTitle>
            <Sidebar
              menu={menu}
              onNavigate={() => {
                setMobileOpen(false);
              }}
            />
          </SheetContent>
        </Sheet>

        <main className="flex min-w-0 flex-1 flex-col overflow-hidden">
          <Outlet />
        </main>
      </div>
    </LayoutContext.Provider>
  );
};
