import { useQuery } from "@tanstack/react-query";
import type { UseQueryResult } from "@tanstack/react-query";
import type { z } from "zod";

import type { DashboardAPI } from "#shared/model/dashboard";
import { DashboardData } from "@/lib/api";

const REFRESH_MS = 30_000;

type Summary = z.infer<typeof DashboardAPI.SUMMARY.response>;
type Servers = z.infer<typeof DashboardAPI.SERVERS.response>;
type Events = z.infer<typeof DashboardAPI.EVENTS.response>;
type Leaderboard = z.infer<typeof DashboardAPI.LEADERBOARD.response>;
type StatusHistory = z.infer<typeof DashboardAPI.STATUS_HISTORY.response>;

export const dashboardSummaryKey = ["dashboard", "summary"] as const;
export const dashboardServersKey = ["dashboard", "servers"] as const;
export const dashboardEventsKey = (limit: number) =>
  ["dashboard", "events", limit] as const;
export const dashboardLeaderboardKey = (limit: number) =>
  ["dashboard", "leaderboard", limit] as const;

export const useDashboardSummary = (): UseQueryResult<Summary> =>
  useQuery({
    queryFn: async () => await DashboardData.summary(),
    queryKey: dashboardSummaryKey,
    refetchInterval: REFRESH_MS,
  });

export const useDashboardServers = (): UseQueryResult<Servers> =>
  useQuery({
    queryFn: async () => await DashboardData.servers(),
    queryKey: dashboardServersKey,
    refetchInterval: REFRESH_MS,
  });

/** 事件流由 SSE（useDashboardEventStream）实时推送，这里只做首屏回填 */
export const useDashboardEvents = (limit = 20): UseQueryResult<Events> =>
  useQuery({
    queryFn: async () => await DashboardData.events(limit),
    queryKey: dashboardEventsKey(limit),
  });

export const useDashboardLeaderboard = (
  limit = 5,
): UseQueryResult<Leaderboard> =>
  useQuery({
    queryFn: async () => await DashboardData.leaderboard(limit),
    queryKey: dashboardLeaderboardKey(limit),
    refetchInterval: REFRESH_MS,
  });

export const useDashboardStatusHistory = (
  serverId: number | undefined,
  hours = 24,
): UseQueryResult<StatusHistory> =>
  useQuery({
    enabled: serverId !== undefined,
    queryFn: async () => await DashboardData.statusHistory(serverId!, hours),
    queryKey: ["dashboard", "status-history", serverId, hours],
    refetchInterval: REFRESH_MS,
  });
