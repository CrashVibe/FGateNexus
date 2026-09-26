import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

// 66rem 容器宽起两列瀑布流；跨栏子元素加 [column-span:all]
export const SettingsColumns = ({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) => (
  <div
    className={cn(
      "@min-[66rem]:columns-2 @min-[66rem]:gap-8 [&>*]:mb-8 [&>*]:break-inside-avoid",
      className,
    )}
  >
    {children}
  </div>
);
