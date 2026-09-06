import { Menu } from "lucide-react";
import type { ReactNode } from "react";

import type { Crumb } from "@/components/layout/breadcrumb";
import { Breadcrumb } from "@/components/layout/breadcrumb";
import { useLayout } from "@/components/layout/context";
import type { PageWidth } from "@/components/layout/page-content";
import { PAGE_WIDTH } from "@/components/layout/page-content";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface PageHeaderProps {
  /** 无 breadcrumb 时渲染。 */
  title?: string;
  description?: string;
  actions?: ReactNode;
  /** 给了就用面包屑替掉标题行。 */
  breadcrumb?: Crumb[];
  /** 标题行的列宽，与同页 PageContent 取同一档。 */
  width?: PageWidth;
}

/** 顶部导航栏：标题 + 描述 + 右侧操作。 */
export const PageHeader = ({
  title,
  description,
  actions,
  breadcrumb,
  width = "list",
}: PageHeaderProps) => {
  const { openMobileSidebar } = useLayout();
  return (
    <div className="border-border h-12 shrink-0 border-b px-5 lg:px-8">
      {/* 三栏布局：左右两栏 flex-1 等分，中间栏居中。 */}
      <div
        className={cn(
          "mx-auto flex h-full items-center gap-3",
          PAGE_WIDTH[width],
        )}
      >
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <Button
            aria-label="打开菜单"
            className="lg:hidden"
            onClick={openMobileSidebar}
            size="icon"
            variant="ghost"
          >
            <Menu />
          </Button>
          {breadcrumb && breadcrumb.length > 0 ? null : (
            <div className="flex min-w-0 flex-col justify-center gap-0.5">
              <span className="text-sm leading-none font-semibold">
                {title}
              </span>
              {description ? (
                <span
                  className="text-muted-foreground truncate text-xs leading-none"
                  title={description}
                >
                  {description}
                </span>
              ) : null}
            </div>
          )}
        </div>
        {breadcrumb && breadcrumb.length > 0 ? (
          <Breadcrumb items={breadcrumb} />
        ) : null}
        <div className="flex flex-1 items-center justify-end gap-2">
          {actions}
        </div>
      </div>
    </div>
  );
};
