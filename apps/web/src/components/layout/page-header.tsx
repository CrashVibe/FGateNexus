import { Menu } from "lucide-react";
import type { ReactNode } from "react";

import { useLayout } from "@/components/layout/context";
import { Button } from "@/components/ui/button";

interface PageHeaderProps {
  title: string;
  description?: string;
  actions?: ReactNode;
}

/** 顶部导航栏：标题 + 描述 + 右侧操作。 */
export const PageHeader = ({
  title,
  description,
  actions,
}: PageHeaderProps) => {
  const { openMobileSidebar } = useLayout();
  return (
    <div className="border-border flex h-16 shrink-0 items-center gap-3 border-b px-5 lg:px-8">
      <Button
        aria-label="打开菜单"
        className="lg:hidden"
        onClick={openMobileSidebar}
        size="icon"
        variant="ghost"
      >
        <Menu />
      </Button>
      <div className="flex min-w-0 flex-col justify-center gap-1">
        <span className="text-base leading-none font-semibold">{title}</span>
        {description ? (
          <span
            className="text-muted-foreground truncate text-xs leading-none"
            title={description}
          >
            {description}
          </span>
        ) : null}
      </div>
      {actions ? (
        <div className="ml-auto flex items-center gap-2">{actions}</div>
      ) : null}
    </div>
  );
};
