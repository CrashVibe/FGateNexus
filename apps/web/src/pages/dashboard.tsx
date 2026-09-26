import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";
import type { z } from "zod";

import type { DashboardAPI } from "#shared/model/dashboard";
import { LoadingState } from "@/components/common/loading-state";
import { EventFeedPanel } from "@/components/dashboard/event-feed-panel";
import { LeaderboardPanel } from "@/components/dashboard/leaderboard-panel";
import { RelayPanel } from "@/components/dashboard/relay-panel";
import { ServerStatusPanel } from "@/components/dashboard/server-status-panel";
import { SetupChecklist } from "@/components/dashboard/setup-checklist";
import { StatsRow } from "@/components/dashboard/stat-tiles";
import { TrendPanel } from "@/components/dashboard/tps-chart";
import { PageContent } from "@/components/layout/page-content";
import { PageHeader } from "@/components/layout/page-header";
import { useDashboardEventStream } from "@/hooks/use-dashboard-event-stream";
import { t } from "@/i18n";
import {
  dashboardEventsKey,
  dashboardLeaderboardKey,
  dashboardSummaryKey,
  useDashboardEvents,
  useDashboardLeaderboard,
  useDashboardServers,
  useDashboardStatusHistory,
  useDashboardSummary,
} from "@/queries/dashboard";

type EventItem = z.infer<typeof DashboardAPI.EVENTS.response>[number];

const EVENTS_LIMIT = 20;
const LEADERBOARD_LIMIT = 5;
/** 此窗口内连续到达的事件合并成一次列表更新。 */
const EVENT_BATCH_MS = 200;

export const DashboardPage = () => {
  const queryClient = useQueryClient();
  const { data: servers, isLoading: serversLoading } = useDashboardServers();
  const { data: summary, isLoading: summaryLoading } = useDashboardSummary();
  const { data: events, isLoading: eventsLoading } =
    useDashboardEvents(EVENTS_LIMIT);
  const { data: leaderboard, isLoading: leaderboardLoading } =
    useDashboardLeaderboard(LEADERBOARD_LIMIT);

  const pendingEventsRef = useRef<EventItem[]>([]);
  const flushTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (flushTimerRef.current) {
        clearTimeout(flushTimerRef.current);
      }
    },
    [],
  );

  useDashboardEventStream(true, (event) => {
    pendingEventsRef.current.push(event);
    if (flushTimerRef.current) {
      return;
    }
    flushTimerRef.current = setTimeout(() => {
      const batch = pendingEventsRef.current;
      pendingEventsRef.current = [];
      flushTimerRef.current = null;

      queryClient.setQueryData(
        dashboardEventsKey(EVENTS_LIMIT),
        (old: typeof events) =>
          [...batch.toReversed(), ...(old ?? [])].slice(0, EVENTS_LIMIT),
      );
      void queryClient.invalidateQueries({ queryKey: dashboardSummaryKey });
      if (batch.some((e) => e.type === "player.death")) {
        void queryClient.invalidateQueries({
          queryKey: dashboardLeaderboardKey(LEADERBOARD_LIMIT),
        });
      }
    }, EVENT_BATCH_MS);
  });

  const onlineServers = useMemo(
    () => (servers ?? []).filter((s) => s.isOnline),
    [servers],
  );
  const offlineServers = useMemo(
    () => (servers ?? []).filter((s) => !s.isOnline),
    [servers],
  );

  const [selectedServerId, setSelectedServerId] = useState<number>();
  const chartServerId =
    selectedServerId ?? onlineServers[0]?.id ?? servers?.[0]?.id;
  const { data: statusHistory, isLoading: historyLoading } =
    useDashboardStatusHistory(chartServerId);

  const loading = serversLoading || summaryLoading || !summary;

  return (
    <>
      <PageHeader
        description={t("所有服务器、机器人与账号绑定的实时状态")}
        title={t("总览")}
      />

      <PageContent className="flex flex-col gap-5">
        {loading ? (
          <LoadingState />
        ) : (
          <>
            <SetupChecklist servers={servers ?? []} summary={summary} />
            <StatsRow offlineServers={offlineServers} summary={summary} />

            <div className="grid grid-cols-1 items-start gap-4 xl:grid-cols-[1.6fr_1fr]">
              <div className="flex flex-col gap-4">
                <ServerStatusPanel
                  onSelect={setSelectedServerId}
                  servers={servers}
                />
                <TrendPanel
                  isLoading={historyLoading}
                  samples={statusHistory?.samples}
                  serverName={
                    servers?.find((s) => s.id === chartServerId)?.name
                  }
                />
              </div>

              <div className="flex flex-col gap-4">
                <RelayPanel
                  serverNames={
                    new Map((servers ?? []).map((s) => [s.id, s.name]))
                  }
                />
                <EventFeedPanel events={events} isLoading={eventsLoading} />
                <LeaderboardPanel
                  isLoading={leaderboardLoading}
                  leaderboard={leaderboard}
                />
              </div>
            </div>
          </>
        )}
      </PageContent>
    </>
  );
};
