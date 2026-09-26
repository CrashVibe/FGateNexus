import { Activity, Bot, Link as LinkIcon, Server, Users } from "lucide-react";
import type { z } from "zod";

import type { DashboardAPI } from "#shared/model/dashboard";
import { Card } from "@/components/ui/card";
import { t } from "@/i18n";

type DashboardServer = z.infer<typeof DashboardAPI.SERVERS.response>[number];
type Summary = z.infer<typeof DashboardAPI.SUMMARY.response>;

const StatTile = ({
  icon: Icon,
  iconClass,
  label,
  value,
  of,
  sub,
}: {
  icon: React.ComponentType<{ className?: string }>;
  iconClass: string;
  label: string;
  value: React.ReactNode;
  of?: React.ReactNode;
  sub?: React.ReactNode;
}) => (
  <Card className="gap-2 p-4">
    <div className="flex items-center justify-between">
      <span className="text-muted-foreground text-xs font-medium">{label}</span>
      <div
        className={`flex size-7 items-center justify-center rounded-md ${iconClass}`}
      >
        <Icon className="size-3.5" />
      </div>
    </div>
    <div className="flex items-baseline gap-1.5 text-2xl font-bold tabular-nums">
      {value}
      {of ? (
        <span className="text-muted-foreground text-sm font-medium">{of}</span>
      ) : null}
    </div>
    {sub ? (
      <span className="text-muted-foreground text-[11px]">{sub}</span>
    ) : null}
  </Card>
);

export const StatsRow = ({
  summary,
  offlineServers,
}: {
  summary: Summary;
  offlineServers: DashboardServer[];
}) => (
  <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
    <StatTile
      icon={Server}
      iconClass="bg-success/12 text-success"
      label={t("在线服务器")}
      of={`/ ${summary.servers.total}`}
      sub={
        offlineServers.length > 0
          ? t("{{length}} 台离线：{{name}}{{v2}}", {
              length: offlineServers.length,
              name: offlineServers[0]?.name,
              v2: offlineServers.length > 1 ? t(" 等") : "",
            })
          : t("全部在线")
      }
      value={summary.servers.online}
    />
    <StatTile
      icon={Users}
      iconClass="bg-primary/12 text-primary"
      label={t("在线玩家")}
      sub={t("实时统计，来自已连接服务器")}
      value={summary.players.online}
    />
    <StatTile
      icon={Bot}
      iconClass="bg-success/12 text-success"
      label={t("机器人在线")}
      of={`/ ${summary.bots.total}`}
      sub={
        summary.bots.online === summary.bots.total
          ? t("全部在线")
          : t("部分离线")
      }
      value={summary.bots.online}
    />
    <StatTile
      icon={LinkIcon}
      iconClass="bg-primary/12 text-primary"
      label={t("已绑定账号")}
      of={`/ ${summary.bindings.total}`}
      sub={
        summary.bindings.total > 0
          ? t("绑定率 {{v0}}%", {
              v0: Math.round(
                (summary.bindings.bound / summary.bindings.total) * 100,
              ),
            })
          : t("暂无玩家")
      }
      value={summary.bindings.bound}
    />
    <StatTile
      icon={Activity}
      iconClass="bg-warning/12 text-warning"
      label={t("今日事件")}
      sub={t("加入 {{join}} · 离开 {{leave}} · 死亡 {{death}}", {
        death: summary.eventsToday.death,
        join: summary.eventsToday.join,
        leave: summary.eventsToday.leave,
      })}
      value={
        summary.eventsToday.join +
        summary.eventsToday.leave +
        summary.eventsToday.death
      }
    />
  </div>
);
