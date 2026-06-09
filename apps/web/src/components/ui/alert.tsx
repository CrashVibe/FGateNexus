import { cva } from "class-variance-authority";
import type { VariantProps } from "class-variance-authority";
import * as React from "react";

import { cn } from "@/lib/utils";

const alertVariants = cva(
  "relative grid w-full grid-cols-[0_1fr] items-start gap-y-0.5 rounded-lg border px-4 py-3 text-sm has-[>svg]:grid-cols-[calc(var(--spacing)*4)_1fr] has-[>svg]:gap-x-3 [&>svg]:size-4 [&>svg]:translate-y-0.5 [&>svg]:text-current",
  {
    defaultVariants: {
      variant: "default",
    },
    variants: {
      variant: {
        default: "bg-card text-card-foreground",
        destructive:
          "bg-card text-destructive *:data-[slot=alert-description]:text-destructive/90 [&>svg]:text-current",
        info: "border-blue-500/30 bg-blue-500/5 text-blue-700 dark:text-blue-400 *:data-[slot=alert-description]:text-blue-700/80 dark:*:data-[slot=alert-description]:text-blue-400/80 [&>svg]:text-current",
        success:
          "border-green-500/30 bg-green-500/5 text-green-700 dark:text-green-400 *:data-[slot=alert-description]:text-green-700/80 dark:*:data-[slot=alert-description]:text-green-400/80 [&>svg]:text-current",
        warning:
          "border-amber-500/30 bg-amber-500/5 text-amber-700 dark:text-amber-400 *:data-[slot=alert-description]:text-amber-700/80 dark:*:data-[slot=alert-description]:text-amber-400/80 [&>svg]:text-current",
      },
    },
  },
);

const Alert = ({
  className,
  variant,
  ...props
}: React.ComponentProps<"div"> & VariantProps<typeof alertVariants>) => (
  <div
    data-slot="alert"
    role="alert"
    className={cn(alertVariants({ variant }), className)}
    {...props}
  />
);

const AlertTitle = ({ className, ...props }: React.ComponentProps<"div">) => (
  <div
    data-slot="alert-title"
    className={cn(
      "col-start-2 line-clamp-1 min-h-4 font-medium tracking-tight",
      className,
    )}
    {...props}
  />
);

const AlertDescription = ({
  className,
  ...props
}: React.ComponentProps<"div">) => (
  <div
    data-slot="alert-description"
    className={cn(
      "text-muted-foreground col-start-2 grid justify-items-start gap-1 text-sm [&_p]:leading-relaxed",
      className,
    )}
    {...props}
  />
);

export { Alert, AlertTitle, AlertDescription };
