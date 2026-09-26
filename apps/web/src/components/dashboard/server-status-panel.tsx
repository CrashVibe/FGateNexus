import { useNavigate } from "@tanstack/react-router";
import { ChevronRight, Users } from "lucide-react";
import type { z } from "zod";

import type { DashboardAPI } from "#shared/model/dashboard";
import { EmptyState } from "@/components/common/empty-state";
import { PanelHeader } from "@/components/dashboard/panel-header";
import { MiniTpsSpark } from "@/components/dashboard/tps-chart";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { t } from "@/i18n";
import { formatMcVersion } from "@/lib/mc-format";

type DashboardServer = z.infer<typeof DashboardAPI.SERVERS.response>[number];

export const ServerStatusPanel = ({
  servers,
  onSelect,
}: {
  servers: DashboardServer[] | undefined;
  onSelect: (id: number) => void;
}) => {
  const navigate = useNavigate();

  return (
    <Card className="gap-0 overflow-hidden p-0">
      <PanelHeader
        hint={t("{{v0}} 台", { v0: servers?.length ?? 0 })}
        title={t("服务器状态")}
      />
      {servers && servers.length > 0 ? (
        <div>
          {servers.map((s) => (
            <div
              className="hover:bg-muted active:bg-accent flex items-center gap-1 border-b px-4 py-2.5 last:border-b-0"
              key={s.id}
            >
              <button
                className="grid flex-1 grid-cols-[1.3fr_1fr_0.6fr_1.1fr] items-center gap-3 text-left"
                onClick={() => {
                  onSelect(s.id);
                }}
                type="button"
              >
                <div className="flex min-w-0 items-center gap-2">
                  <span
                    className={`size-1.5 shrink-0 rounded-full ${s.isOnline ? "bg-success" : "bg-muted-foreground"}`}
                  />
                  <span className="truncate text-sm font-semibold">
                    {s.name}
                  </span>
                </div>
                <span className="text-muted-foreground truncate text-xs">
                  {s.isOnline
                    ? `${s.software ?? t("未知服务端")} · ${formatMcVersion(s.version)}`
                    : t("未连接")}
                </span>
                <span className="text-muted-foreground flex items-center gap-1 text-xs tabular-nums">
                  {s.isOnline && s.onlinePlayers !== null ? (
                    <>
                      <Users className="size-3" />
                      {s.onlinePlayers}
                    </>
                  ) : (
                    "—"
                  )}
                </span>
                {s.isOnline ? (
                  <MiniTpsSpark samples={s.recentTps} />
                ) : (
                  <Badge className="w-fit" variant="secondary">
                    {t("离线")}
                  </Badge>
                )}
              </button>
              <button
                aria-label={t("查看服务器详情")}
                className="text-muted-foreground hover:text-foreground hover:bg-accent active:bg-accent-pressed shrink-0 rounded-md p-1.5"
                onClick={() => {
                  void navigate({
                    params: { id: String(s.id) },
                    to: "/servers/$id/general",
                  });
                }}
                type="button"
              >
                <ChevronRight className="size-4" />
              </button>
            </div>
          ))}
        </div>
      ) : (
        <EmptyState
          action={
            <button
              className="text-primary text-sm"
              onClick={() => {
                void navigate({ to: "/servers" });
              }}
              type="button"
            >
              {t("去创建服务器")}
            </button>
          }
          className="py-10"
          desc={t("还没有配置服务器")}
        />
      )}
    </Card>
  );
};
