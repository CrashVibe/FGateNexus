import dayjs from "dayjs";

import type { LastEvent } from "#shared/model/status";
import { t } from "@/i18n";
import { cn } from "@/lib/utils";

/** 卡片上的「最近一次连接变化」 */
export const LastEventLine = ({ event }: { event?: LastEvent | null }) =>
  event ? (
    <p
      className={cn(
        "text-xs",
        event.ok ? "text-muted-foreground" : "text-destructive",
      )}
      title={dayjs(event.at).format("YYYY-MM-DD HH:mm:ss")}
    >
      {dayjs(event.at).fromNow()} · {t(event.text)}
    </p>
  ) : null;
