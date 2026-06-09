import type * as React from "react";

import { cn } from "@/lib/utils";

export const Table = ({
  className,
  ...props
}: React.ComponentProps<"table">) => (
  <div className="relative w-full overflow-x-auto" data-slot="table-container">
    <table
      className={cn("w-full caption-bottom text-sm", className)}
      data-slot="table"
      {...props}
    />
  </div>
);

export const TableHeader = ({
  className,
  ...props
}: React.ComponentProps<"thead">) => (
  <thead
    className={cn("[&_tr]:border-b", className)}
    data-slot="table-header"
    {...props}
  />
);

export const TableBody = ({
  className,
  ...props
}: React.ComponentProps<"tbody">) => (
  <tbody
    className={cn("[&_tr:last-child]:border-0", className)}
    data-slot="table-body"
    {...props}
  />
);

export const TableRow = ({
  className,
  ...props
}: React.ComponentProps<"tr">) => (
  <tr
    className={cn(
      "hover:bg-muted/50 data-[state=selected]:bg-muted border-b transition-colors",
      className,
    )}
    data-slot="table-row"
    {...props}
  />
);

export const TableHead = ({
  className,
  ...props
}: React.ComponentProps<"th">) => (
  <th
    className={cn(
      "text-muted-foreground h-10 px-2 text-left align-middle font-medium whitespace-nowrap",
      className,
    )}
    data-slot="table-head"
    {...props}
  />
);

export const TableCell = ({
  className,
  ...props
}: React.ComponentProps<"td">) => (
  <td
    className={cn("p-2 align-middle whitespace-nowrap", className)}
    data-slot="table-cell"
    {...props}
  />
);

export const TableCaption = ({
  className,
  ...props
}: React.ComponentProps<"caption">) => (
  <caption
    className={cn("text-muted-foreground mt-4 text-sm", className)}
    data-slot="table-caption"
    {...props}
  />
);
