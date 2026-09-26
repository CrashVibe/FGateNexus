import { Loader2 } from "lucide-react";

import { t } from "@/i18n";

/** 居中的加载占位。 */
export const LoadingState = ({ text }: { text?: string }) => (
  <div className="py-12">
    <div className="flex flex-col items-center gap-3">
      <Loader2 className="text-muted-foreground size-6 animate-spin" />
      <p className="text-muted-foreground text-sm">
        {text ?? t("正在加载配置...")}
      </p>
    </div>
  </div>
);
