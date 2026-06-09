import type * as React from "react";

import { cn } from "@/lib/utils";

export const Skeleton = ({
  className,
  ...props
}: React.ComponentProps<"div">) => (
  <div
    className={cn("bg-accent animate-pulse rounded-md", className)}
    data-slot="skeleton"
    {...props}
  />
);
