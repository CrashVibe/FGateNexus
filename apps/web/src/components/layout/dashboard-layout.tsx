import { Outlet, useBlocker, useLocation } from "@tanstack/react-router";
import { useMemo, useState } from "react";

import { LayoutContext } from "@/components/layout/context";
import { Sidebar } from "@/components/layout/sidebar";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { useDragResize } from "@/hooks/use-drag-resize";
import { basicMenu, serverMenu } from "@/lib/menu";
import { usePageStateStore } from "@/stores/page-state";

/** Dashboard 布局：侧边菜单（随服务器编辑态切换）+ 脏页面离开拦截。 */
export const DashboardLayout = () => {
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  const sid = useMemo(() => {
    const match = /^\/servers\/(?<serverId>[^/]+)/u.exec(location.pathname);
    return match?.[1];
  }, [location.pathname]);

  const menu = useMemo(() => (sid ? serverMenu(sid) : basicMenu()), [sid]);

  const [sidebarWidth, startSidebarResize] = useDragResize(240, 180, 400);
  const isPageDirty = usePageStateStore((s) => s.isPageDirty);
  const savePage = usePageStateStore((s) => s.savePage);
  const clearPageState = usePageStateStore((s) => s.clearPageState);

  // 脏页面守卫：存在未保存更改时拦截路由跳转，弹窗让用户保存/放弃。
  const blocker = useBlocker({
    enableBeforeUnload: false, // 不在刷新/关闭页签时弹浏览器原生提示
    shouldBlockFn: () => isPageDirty(),
    withResolver: true,
  });

  const handleDiscard = (): void => {
    clearPageState();
    blocker.proceed?.();
  };

  const handleSaveAndGo = async (): Promise<void> => {
    await savePage();
    blocker.proceed?.();
  };

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
            <SheetTitle className="sr-only">导航菜单</SheetTitle>
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

      <Dialog
        onOpenChange={(open) => {
          if (!open) {
            blocker.reset?.();
          }
        }}
        open={blocker.status === "blocked"}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>有未保存的更改</DialogTitle>
            <DialogDescription>
              切换页面前请保存更改，或放弃未保存内容。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button onClick={handleDiscard} variant="outline">
              放弃更改
            </Button>
            <Button
              onClick={() => {
                void handleSaveAndGo();
              }}
            >
              保存并切换
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </LayoutContext.Provider>
  );
};
