import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

/** 页面列宽档位，PageHeader 与 PageContent 共用。 */
export const PAGE_WIDTH = {
  form: "max-w-2xl",
  full: "max-w-none",
  list: "max-w-7xl",
  /** 容器宽度判断，侧栏可拖宽 */
  settings: "max-w-2xl @min-[66rem]:max-w-6xl @min-[96rem]:max-w-7xl",
  wide: "max-w-5xl",
} as const;

export type PageWidth = keyof typeof PAGE_WIDTH;

/**
 * 页头之下的滚动容器：统一滚动条、内边距与列宽。
 * 加载态与内容态共用同一个容器。
 */
export const PageContent = ({
  width = "list",
  className,
  children,
}: {
  width?: PageWidth;
  className?: string;
  children: ReactNode;
}) => (
  // 外层出 px，内层出 max-w + mx-auto，与 PageHeader 同构。
  <div className="scrollbar-custom @container flex-1 overflow-y-auto px-5 py-8 lg:px-8">
    <div className={cn("mx-auto", PAGE_WIDTH[width], className)}>
      {children}
    </div>
  </div>
);
