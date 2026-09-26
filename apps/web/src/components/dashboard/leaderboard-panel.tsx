import type { z } from "zod";

import type { DashboardAPI } from "#shared/model/dashboard";
import { EmptyState } from "@/components/common/empty-state";
import { LoadingState } from "@/components/common/loading-state";
import { PanelHeader } from "@/components/dashboard/panel-header";
import { Card } from "@/components/ui/card";
import { useFlipRows, useNewItemIds } from "@/hooks/use-flip-rows";
import { t } from "@/i18n";
import { cn } from "@/lib/utils";

type LeaderboardEntry = z.infer<
  typeof DashboardAPI.LEADERBOARD.response
>[number];

export const LeaderboardPanel = ({
  isLoading,
  leaderboard,
}: {
  isLoading: boolean;
  leaderboard: LeaderboardEntry[] | undefined;
}) => {
  const registerRow = useFlipRows(leaderboard);
  const isNewEntry = useNewItemIds(leaderboard, (e) => e.playerUuid);

  const body = (() => {
    if (isLoading) {
      return <LoadingState />;
    }
    if (!leaderboard || leaderboard.length === 0) {
      return (
        <EmptyState className="py-10" desc={t("今天还没有玩家死亡记录")} />
      );
    }
    return (
      <div className="overflow-x-hidden">
        {leaderboard.map((entry, i) => (
          <div
            className={cn(
              "flex items-center gap-2.5 border-b px-4 py-2 last:border-b-0",
              isNewEntry(entry.playerUuid) && "animate-slide-in-event",
            )}
            key={entry.playerUuid}
            ref={registerRow(entry.playerUuid)}
          >
            <div
              className={`flex size-4.5 shrink-0 items-center justify-center rounded text-[10.5px] font-bold tabular-nums ${
                i < 3
                  ? "bg-warning/18 text-warning"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              {i + 1}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-semibold">
                {entry.playerName ?? t("未知玩家")}
              </p>
              <p className="text-muted-foreground truncate text-[10.5px]">
                {t("最近：")}
                {(entry.lastData as { message?: string } | null)?.message ??
                  t("未知死因")}
              </p>
            </div>
            <span className="shrink-0 text-sm font-bold tabular-nums">
              {entry.count}
              <span className="text-muted-foreground ml-0.5 text-[10.5px] font-medium">
                {t("次")}
              </span>
            </span>
          </div>
        ))}
      </div>
    );
  })();

  return (
    <Card className="gap-0 overflow-hidden p-0">
      <PanelHeader hint={t("全部服务器")} title={t("今日死亡榜")} />
      {body}
    </Card>
  );
};
