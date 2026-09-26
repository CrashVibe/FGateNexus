import dayjs from "dayjs";
import { Activity, LogIn, LogOut, Skull } from "lucide-react";
import type { z } from "zod";

import type { DashboardAPI } from "#shared/model/dashboard";
import { EmptyState } from "@/components/common/empty-state";
import { LoadingState } from "@/components/common/loading-state";
import { PanelHeader } from "@/components/dashboard/panel-header";
import { Card } from "@/components/ui/card";
import { useFlipRows, useNewItemIds } from "@/hooks/use-flip-rows";
import { t } from "@/i18n";
import { cn } from "@/lib/utils";

type EventItem = z.infer<typeof DashboardAPI.EVENTS.response>[number];

const EVENT_META: Record<
  string,
  { icon: React.ComponentType<{ className?: string }>; className: string }
> = {
  "player.death": {
    className: "bg-destructive/12 text-destructive",
    icon: Skull,
  },
  "player.join": { className: "bg-success/12 text-success", icon: LogIn },
  "player.leave": {
    className: "bg-muted text-muted-foreground",
    icon: LogOut,
  },
};

const eventLine = (e: EventItem): string => {
  const name = e.playerName ?? t("未知玩家");
  if (e.type === "player.join") {
    return t("{{name}} 加入了服务器", { name });
  }
  if (e.type === "player.leave") {
    return t("{{name}} 离开了服务器", { name });
  }
  if (e.type === "player.death") {
    const message = (e.data as { message?: string } | null)?.message;
    return message ? `${name} ${message}` : t("{{name}} 死亡了", { name });
  }
  return t("{{name}} 触发了 {{type}}", { name, type: e.type });
};

export const EventFeedPanel = ({
  isLoading,
  events,
}: {
  isLoading: boolean;
  events: EventItem[] | undefined;
}) => {
  const registerRow = useFlipRows(events);
  const isNewRow = useNewItemIds(events, (e) => e.id);

  const body = (() => {
    if (isLoading) {
      return <LoadingState />;
    }
    if (!events || events.length === 0) {
      return (
        <EmptyState
          className="py-10"
          desc={t("暂无事件，玩家加入/离开/死亡后会出现在这里")}
        />
      );
    }
    return (
      <div className="scrollbar-custom max-h-[420px] overflow-x-hidden overflow-y-auto">
        {events.map((e) => {
          const meta = EVENT_META[e.type];
          const Icon = meta?.icon ?? Activity;
          return (
            <div
              className={cn(
                "flex gap-2.5 border-b px-4 py-2.5 last:border-b-0",
                isNewRow(e.id) && "animate-slide-in-event",
              )}
              key={e.id}
              ref={registerRow(e.id)}
            >
              <div
                className={`mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full ${meta?.className ?? "bg-muted text-muted-foreground"}`}
              >
                <Icon className="size-3" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs leading-relaxed">{eventLine(e)}</p>
                <div className="mt-0.5 flex items-center gap-1.5">
                  <span className="bg-muted text-muted-foreground rounded-full px-1.5 py-px text-[10px]">
                    {e.serverName}
                  </span>
                  <span className="text-muted-foreground text-[10.5px]">
                    {dayjs(e.createdAt).fromNow()}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    );
  })();

  return (
    <Card className="gap-0 overflow-hidden p-0">
      <PanelHeader hint={t("全部服务器")} title={t("实时事件")} />
      {body}
    </Card>
  );
};
