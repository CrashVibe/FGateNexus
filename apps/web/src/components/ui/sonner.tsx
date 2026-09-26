import { Toaster as Sonner } from "sonner";
import type { ToasterProps } from "sonner";

import { useResolvedTheme } from "@/lib/theme";

/** 全局 Toast 容器（跟随应用主题，右上角）。 */
export const Toaster = (props: ToasterProps) => {
  const theme = useResolvedTheme();
  return (
    <Sonner
      position="top-right"
      theme={theme}
      toastOptions={{
        classNames: {
          actionButton: "!bg-primary !text-primary-foreground !text-xs",
          cancelButton: "!bg-secondary !text-secondary-foreground !text-xs",
          closeButton:
            "!border-border !bg-card !text-muted-foreground hover:!text-foreground",
          description: "!text-xs !text-muted-foreground",
          title: "!text-sm !font-medium",
          toast:
            "!rounded-lg !border !border-border !bg-card !text-foreground !shadow-lg !font-sans",
        },
      }}
      {...props}
    />
  );
};

export { toast } from "sonner";
