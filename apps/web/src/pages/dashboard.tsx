import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import dayjs from "dayjs";
import "dayjs/locale/zh-cn";
import relativeTime from "dayjs/plugin/relativeTime";
import {
  Activity,
  Bot,
  ChevronRight,
  Link as LinkIcon,
  LogIn,
  LogOut,
  Server,
  Skull,
  Users,
} from "lucide-react";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { z } from "zod";

import type { DashboardAPI } from "#shared/model/dashboard";
import { EmptyState } from "@/components/common/empty-state";
import { LoadingState } from "@/components/common/loading-state";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { useDashboardEventStream } from "@/hooks/use-dashboard-event-stream";
import { formatMcVersion } from "@/lib/mc-format";
import { cn } from "@/lib/utils";
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

dayjs.extend(relativeTime);
dayjs.locale("zh-cn");

type EventItem = z.infer<typeof DashboardAPI.EVENTS.response>[number];
type LeaderboardEntry = z.infer<
  typeof DashboardAPI.LEADERBOARD.response
>[number];
type DashboardServer = z.infer<typeof DashboardAPI.SERVERS.response>[number];
type StatusSample = z.infer<
  typeof DashboardAPI.STATUS_HISTORY.response
>["samples"][number];
type Summary = z.infer<typeof DashboardAPI.SUMMARY.response>;

const PanelHeader = ({ title, hint }: { title: string; hint: string }) => (
  <div className="flex items-center justify-between border-b px-4 py-3">
    <h2 className="text-sm font-semibold">{title}</h2>
    <span className="text-muted-foreground text-xs">{hint}</span>
  </div>
);

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

const StatsRow = ({
  summary,
  offlineServers,
}: {
  summary: Summary;
  offlineServers: DashboardServer[];
}) => (
  <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
    <StatTile
      icon={Server}
      iconClass="bg-green-500/12 text-green-500"
      label="在线服务器"
      of={`/ ${summary.servers.total}`}
      sub={
        offlineServers.length > 0
          ? `${offlineServers.length} 台离线：${offlineServers[0]?.name}${offlineServers.length > 1 ? " 等" : ""}`
          : "全部在线"
      }
      value={summary.servers.online}
    />
    <StatTile
      icon={Users}
      iconClass="bg-primary/12 text-primary"
      label="在线玩家"
      sub="实时统计，来自已连接服务器"
      value={summary.players.online}
    />
    <StatTile
      icon={Bot}
      iconClass="bg-green-500/12 text-green-500"
      label="Bot 连接"
      of={`/ ${summary.bots.total}`}
      sub={summary.bots.online === summary.bots.total ? "全部在线" : "部分离线"}
      value={summary.bots.online}
    />
    <StatTile
      icon={LinkIcon}
      iconClass="bg-primary/12 text-primary"
      label="已绑定账号"
      of={`/ ${summary.bindings.total}`}
      sub={
        summary.bindings.total > 0
          ? `绑定率 ${Math.round((summary.bindings.bound / summary.bindings.total) * 100)}%`
          : "暂无玩家"
      }
      value={summary.bindings.bound}
    />
    <StatTile
      icon={Activity}
      iconClass="bg-amber-500/12 text-amber-600 dark:text-amber-400"
      label="今日事件"
      sub={`加入 ${summary.eventsToday.join} · 离开 ${summary.eventsToday.leave} · 死亡 ${summary.eventsToday.death}`}
      value={
        summary.eventsToday.join +
        summary.eventsToday.leave +
        summary.eventsToday.death
      }
    />
  </div>
);

const TPS_MAX = 20;
const SPARK_W = 76;
const SPARK_H = 24;
const SPARK_PAD = 2;

/** TPS 值按上限限幅后映射到图表 Y 坐标（0 在底部） */
const tpsToY = (tps: number, height: number, pad: number): number => {
  const clamped = Math.min(Math.max(tps, 0), TPS_MAX);
  return height - pad - (clamped / TPS_MAX) * (height - pad * 2);
};

const tpsTone = (tps: number): string => {
  if (tps >= 18) {
    return "text-green-500";
  }
  if (tps >= 15) {
    return "text-amber-500";
  }
  return "text-destructive";
};

/** 服务器行内的迷你 TPS 走势，仅用最近样本，纯位移无坐标轴 */
const MiniTpsSpark = ({ samples }: { samples: { tps: number | null }[] }) => {
  const points = samples.filter((s): s is { tps: number } => s.tps !== null);
  if (points.length < 2) {
    return <span className="text-muted-foreground text-xs">—</span>;
  }
  const path = points
    .map(
      (p, i) =>
        `${((i / (points.length - 1)) * SPARK_W).toFixed(1)},${tpsToY(p.tps, SPARK_H, SPARK_PAD).toFixed(1)}`,
    )
    .join(" ");
  const last = points.at(-1)!.tps;
  const tone = tpsTone(last);

  return (
    <div className="flex shrink-0 items-center gap-1.5">
      <svg
        className={cn("h-6 w-[76px]", tone)}
        preserveAspectRatio="none"
        viewBox={`0 0 ${SPARK_W} ${SPARK_H}`}
      >
        <title>近期 TPS 走势</title>
        <polyline
          fill="none"
          points={path}
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.6"
        />
      </svg>
      <span className={cn("text-xs font-semibold tabular-nums", tone)}>
        {last.toFixed(1)}
      </span>
    </div>
  );
};

const ServerStatusPanel = ({
  servers,
  onSelect,
}: {
  servers: DashboardServer[] | undefined;
  onSelect: (id: number) => void;
}) => {
  const navigate = useNavigate();

  return (
    <Card className="gap-0 overflow-hidden p-0">
      <PanelHeader hint={`${servers?.length ?? 0} 台`} title="服务器状态" />
      {servers && servers.length > 0 ? (
        <div>
          {servers.map((s) => (
            <div
              className="hover:bg-accent/50 flex items-center gap-1 border-b px-4 py-2.5 last:border-b-0"
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
                    className={`size-1.5 shrink-0 rounded-full ${s.isOnline ? "bg-green-500" : "bg-muted-foreground"}`}
                  />
                  <span className="truncate text-sm font-semibold">
                    {s.name}
                  </span>
                </div>
                <span className="text-muted-foreground truncate text-xs">
                  {s.isOnline
                    ? `${s.software ?? "未知服务端"} · ${formatMcVersion(s.version)}`
                    : "未连接"}
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
                    离线
                  </Badge>
                )}
              </button>
              <button
                aria-label="查看服务器详情"
                className="text-muted-foreground hover:text-foreground hover:bg-accent shrink-0 rounded-md p-1.5"
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
              去创建服务器
            </button>
          }
          className="py-10"
          desc="还没有配置服务器"
        />
      )}
    </Card>
  );
};

const CHART_W = 600;
const CHART_H = 108;
const CHART_PAD = 8;

const TrendChart = ({ samples }: { samples: StatusSample[] }) => {
  const points = samples.filter((s) => s.tps !== null) as (StatusSample & {
    tps: number;
  })[];

  if (points.length < 2) {
    return (
      <EmptyState
        className="py-10"
        desc="样本不足，等待下一次状态采集（每 60 秒一次）"
      />
    );
  }

  const coords = points.map((p, i) => {
    const x = (i / (points.length - 1)) * CHART_W;
    return [x, tpsToY(p.tps, CHART_H, CHART_PAD)] as const;
  });
  const linePath = coords
    .map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`)
    .join(" ");
  const areaPath = `${linePath} L${CHART_W},${CHART_H} L0,${CHART_H} Z`;
  const last = points.at(-1)!;
  const avg = points.reduce((s, p) => s + p.tps, 0) / points.length;
  const [lastX, lastY] = coords.at(-1)!;

  return (
    <div className="px-4 pt-3 pb-4">
      <div className="mb-1.5 flex items-baseline gap-2">
        <span className="text-xl font-bold tabular-nums">
          {last.tps.toFixed(1)}
        </span>
        <span className="text-muted-foreground text-[11px]">
          当前 TPS，均值 {avg.toFixed(1)}
        </span>
      </div>
      <svg
        aria-label="TPS 趋势图"
        className="block h-[108px] w-full"
        preserveAspectRatio="none"
        viewBox={`0 0 ${CHART_W} ${CHART_H}`}
      >
        <defs>
          <linearGradient id="tpsFill" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.22" />
            <stop offset="100%" stopColor="var(--primary)" stopOpacity="0" />
          </linearGradient>
        </defs>
        {[20, 60, 100].map((y) => (
          <line
            key={y}
            stroke="var(--border)"
            strokeWidth="1"
            x1="0"
            x2={CHART_W}
            y1={y}
            y2={y}
          />
        ))}
        <path d={areaPath} fill="url(#tpsFill)" />
        <path
          d={linePath}
          fill="none"
          stroke="var(--primary)"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2"
        />
        <circle cx={lastX} cy={lastY} fill="var(--primary)" r="4" />
      </svg>
    </div>
  );
};

const TrendPanel = ({
  serverName,
  isLoading,
  samples,
}: {
  serverName: string | undefined;
  isLoading: boolean;
  samples: StatusSample[] | undefined;
}) => {
  const title = serverName ? `TPS 趋势 · ${serverName}` : "TPS 趋势";

  return (
    <Card className="gap-0 overflow-hidden p-0">
      <PanelHeader hint="最近 24 小时" title={title} />
      {(() => {
        if (isLoading) {
          return <LoadingState />;
        }
        if (samples) {
          return <TrendChart samples={samples} />;
        }
        return (
          <EmptyState className="py-10" desc="选择一台在线服务器查看趋势" />
        );
      })()}
    </Card>
  );
};

const EVENT_META: Record<
  string,
  { icon: React.ComponentType<{ className?: string }>; className: string }
> = {
  "player.death": {
    className: "bg-destructive/12 text-destructive",
    icon: Skull,
  },
  "player.join": { className: "bg-green-500/12 text-green-500", icon: LogIn },
  "player.leave": {
    className: "bg-muted text-muted-foreground",
    icon: LogOut,
  },
};

const eventLine = (e: EventItem): string => {
  const name = e.playerName ?? "未知玩家";
  if (e.type === "player.join") {
    return `${name} 加入了服务器`;
  }
  if (e.type === "player.leave") {
    return `${name} 离开了服务器`;
  }
  if (e.type === "player.death") {
    const message = (e.data as { message?: string } | null)?.message;
    return message ? `${name} ${message}` : `${name} 死亡了`;
  }
  return `${name} 触发了 ${e.type}`;
};

const FLIP_MS = 420;
const FLIP_EASE = "cubic-bezier(0.22, 1.24, 0.34, 1)";

type RowKey = string | number;

/**
 * FLIP：列表因插入/排序变化导致某行位置变化时，从旧位置动画到新位置
 * （新出现的行走 CSS 的滑入动画，见 useNewItemIds）。
 * items 只作为"什么时候需要重新测量"的变化信号，本身不被读取。
 */
const useFlipRows = (items: unknown) => {
  const nodesRef = useRef(new Map<RowKey, HTMLDivElement>());
  const rectsRef = useRef(new Map<RowKey, DOMRect>());

  useLayoutEffect(() => {
    const nextRects = new Map<RowKey, DOMRect>();
    for (const [id, node] of nodesRef.current) {
      const rect = node.getBoundingClientRect();
      nextRects.set(id, rect);
      const prevRect = rectsRef.current.get(id);
      const dy = prevRect ? prevRect.top - rect.top : 0;
      if (!dy) {
        continue;
      }
      node.style.transition = "none";
      node.style.transform = `translateY(${dy}px)`;
      node.getBoundingClientRect(); // 强制回流，让位移先生效再过渡回 0
      requestAnimationFrame(() => {
        node.style.transition = `transform ${FLIP_MS}ms ${FLIP_EASE}`;
        node.style.transform = "";
      });
    }
    rectsRef.current = nextRects;
  }, [items]);

  return (id: RowKey) => (node: HTMLDivElement | null) => {
    if (node) {
      nodesRef.current.set(id, node);
    } else {
      nodesRef.current.delete(id);
    }
  };
};

/**
 * 首屏回填不算新；此后相对上一次渲染"新出现"的 id 判定为新行，用于只让
 * 真正新增的行播放入场动画。按 id 集合判断而非一次性标记，避免无关的
 * 重渲染（如后台 refetch 出同样的数据）误触发已存在行的动画。
 */
const useNewItemIds = <T,>(
  items: T[] | undefined,
  getId: (item: T) => RowKey,
) => {
  const initializedRef = useRef(false);
  const seenIdsRef = useRef<Set<RowKey>>(new Set());
  const getIdRef = useRef(getId);
  getIdRef.current = getId;

  useEffect(() => {
    if (items !== undefined) {
      seenIdsRef.current = new Set(items.map((item) => getIdRef.current(item)));
      initializedRef.current = true;
    }
  }, [items]);

  return (id: RowKey): boolean =>
    initializedRef.current && !seenIdsRef.current.has(id);
};

const EventFeedPanel = ({
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
          desc="暂无事件，玩家加入/离开/死亡后会出现在这里"
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
      <PanelHeader hint="全部服务器" title="实时事件" />
      {body}
    </Card>
  );
};

const LeaderboardPanel = ({
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
      return <EmptyState className="py-10" desc="今天还没有玩家死亡记录" />;
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
                  ? "bg-amber-500/18 text-amber-600 dark:text-amber-400"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              {i + 1}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-semibold">
                {entry.playerName ?? "未知玩家"}
              </p>
              <p className="text-muted-foreground truncate text-[10.5px]">
                最近：
                {(entry.lastData as { message?: string } | null)?.message ??
                  "未知死因"}
              </p>
            </div>
            <span className="shrink-0 text-sm font-bold tabular-nums">
              {entry.count}
              <span className="text-muted-foreground ml-0.5 text-[10.5px] font-medium">
                次
              </span>
            </span>
          </div>
        ))}
      </div>
    );
  })();

  return (
    <Card className="gap-0 overflow-hidden p-0">
      <PanelHeader hint="全部服务器" title="今日死亡榜" />
      {body}
    </Card>
  );
};

const EVENTS_LIMIT = 20;
const LEADERBOARD_LIMIT = 5;
/** 短时间内连续到达的事件合并成一次列表更新，避免高频推送时反复重渲染/重排 */
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

  if (serversLoading || summaryLoading || !summary) {
    return (
      <>
        <PageHeader
          description="所有服务器、Bot 与账号绑定的实时状态"
          title="总览"
        />
        <div className="scrollbar-custom flex-1 overflow-y-auto">
          <div className="mx-auto max-w-7xl px-4 py-8 lg:px-6">
            <LoadingState />
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <PageHeader
        description="所有服务器、Bot 与账号绑定的实时状态"
        title="总览"
      />

      <div className="scrollbar-custom flex-1 overflow-y-auto">
        <div className="mx-auto flex max-w-7xl flex-col gap-5 px-4 py-8 lg:px-6">
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
                serverName={servers?.find((s) => s.id === chartServerId)?.name}
              />
            </div>

            <div className="flex flex-col gap-4">
              <EventFeedPanel events={events} isLoading={eventsLoading} />
              <LeaderboardPanel
                isLoading={leaderboardLoading}
                leaderboard={leaderboard}
              />
            </div>
          </div>
        </div>
      </div>
    </>
  );
};
