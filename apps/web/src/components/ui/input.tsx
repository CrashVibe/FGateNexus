import type * as React from "react";

import { cn } from "@/lib/utils";

export const Input = ({
  className,
  type,
  ...props
}: React.ComponentProps<"input">) => (
  <input
    className={cn(
      "border-input placeholder:text-muted-foreground flex h-9 w-full min-w-0 [appearance:textfield] rounded-md border bg-transparent px-3 py-1 text-base shadow-xs transition-[color,box-shadow] outline-none file:inline-flex file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none",
      "focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]",
      "aria-invalid:border-destructive aria-invalid:ring-destructive/20",
      className,
    )}
    data-slot="input"
    type={type}
    {...props}
  />
);
