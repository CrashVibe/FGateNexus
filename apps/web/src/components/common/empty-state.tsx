import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export const EmptyState = ({
  icon,
  title,
  desc,
  action,
  className,
}: {
  icon?: ReactNode;
  title?: string;
  desc: string;
  action: ReactNode;
  className?: string;
}) => (
  <div
    className={cn("flex flex-col items-center gap-4 text-center", className)}
  >
    {icon}
    <div>
      {title ? <p className="font-medium">{title}</p> : null}
      <p className="text-muted-foreground mt-1 text-sm">{desc}</p>
    </div>
    {action}
  </div>
);
