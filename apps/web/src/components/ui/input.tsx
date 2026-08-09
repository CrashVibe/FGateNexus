import type * as React from "react";

import { cn } from "@/lib/utils";

export const Input = ({
  className,
  type,
  ...props
}: React.ComponentProps<"input">) => (
  <input
    className={cn(
      "border-input placeholder:text-muted-foreground flex h-9 w-full min-w-0 [appearance:textfield] rounded-md border bg-transparent px-3 py-1 text-base shadow-xs transition-[border-color,box-shadow] duration-200 ease-out outline-none file:inline-flex file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none",
      "focus-visible:border-ring focus-visible:shadow-[0_0_0_1px_var(--ring),0_0_16px_1px_color-mix(in_oklch,var(--ring)_55%,transparent),0_0_0_5px_color-mix(in_oklch,var(--ring)_12%,transparent)]",
      "aria-invalid:border-destructive aria-invalid:shadow-[0_0_0_1px_var(--destructive),0_0_16px_1px_color-mix(in_oklch,var(--destructive)_55%,transparent),0_0_0_5px_color-mix(in_oklch,var(--destructive)_12%,transparent)]",
      className,
    )}
    data-slot="input"
    type={type}
    {...props}
  />
);
