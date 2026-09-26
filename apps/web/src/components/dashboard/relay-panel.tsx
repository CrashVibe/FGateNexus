import { useQuery, useQueryClient } from "@tanstack/react-query";
import dayjs from "dayjs";

import type { RelayEntry } from "#shared/model/dashboard";
import { EmptyState } from "@/components/common/empty-state";
import { LoadingState } from "@/components/common/loading-state";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { useSSE } from "@/hooks/use-sse";
import { t } from "@/i18n";
import { DashboardData } from "@/lib/api";

const LIMIT = 30;
const relaysKey = ["dashboard", "relays", LIMIT] as const;

const STATUS: Record<
  RelayEntry["status"],
  {
    label: string;
    variant: "success" | "secondary" | "warning" | "destructive";
  }
> = {
  failed: { label: t("失败"), variant: "destructive" },
  filtered: { label: t("被过滤"), variant: "warning" },
  sent: { label: t("已发送"), variant: "success" },
  skipped: { label: t("没转发"), variant: "secondary" },
};

/** 最近的聊天转发：发了没、没发的话为什么 */
export const RelayPanel = ({
  serverNames,
}: {
  serverNames: Map<number, string>;
}) => {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({
    queryFn: async () => await DashboardData.relays(LIMIT),
    queryKey: relaysKey,
  });

  useSSE(true, "/api/dashboard/relay-stream", "relay", (entry: RelayEntry) => {
    queryClient.setQueryData(relaysKey, (old: RelayEntry[] | undefined) =>
      [entry, ...(old ?? [])].slice(0, LIMIT),
    );
  });

  const body = (() => {
    if (isLoading) {
      return <LoadingState />;
    }
    if (!data || data.length === 0) {
      return (
        <EmptyState
          className="py-10"
          desc={t("还没有聊天经过这里；MC 或群里有人说话后会出现")}
        />
      );
    }
    return (
      <div className="scrollbar-custom max-h-[420px] overflow-y-auto">
        {data.map((r) => {
          const status = STATUS[r.status];
          return (
            <div
              className="border-b px-4 py-2.5 last:border-b-0"
              key={`${r.t}-${r.serverId}-${r.target ?? ""}-${r.from}`}
            >
              <div className="flex items-center gap-2">
                <Badge variant={status.variant}>{status.label}</Badge>
                <span className="text-muted-foreground text-[10.5px]">
                  {r.direction === "mc_to_platform"
                    ? t("MC → 群")
                    : t("群 → MC")}
                  {" · "}
                  {serverNames.get(r.serverId) ?? `#${r.serverId}`}
                  {r.target ? ` · ${r.target}` : ""}
                  {" · "}
                  {dayjs(r.t).fromNow()}
                </span>
              </div>
              <p className="mt-1 truncate text-xs">
                <span className="font-medium">{r.from}</span>：{r.text}
              </p>
              {r.reason ? (
                <p className="text-muted-foreground mt-0.5 text-[11px]">
                  {t(r.reason)}
                </p>
              ) : null}
            </div>
          );
        })}
      </div>
    );
  })();

  return (
    <Card className="gap-0 overflow-hidden p-0">
      <div className="flex items-center justify-between border-b px-4 py-3">
        <h2 className="text-sm font-semibold">{t("最近消息")}</h2>
        <span className="text-muted-foreground text-xs">{t("重启后清空")}</span>
      </div>
      {body}
    </Card>
  );
};
