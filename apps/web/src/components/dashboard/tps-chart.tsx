import type { z } from "zod";

import type { DashboardAPI } from "#shared/model/dashboard";
import { EmptyState } from "@/components/common/empty-state";
import { LoadingState } from "@/components/common/loading-state";
import { PanelHeader } from "@/components/dashboard/panel-header";
import { Card } from "@/components/ui/card";
import { t } from "@/i18n";
import { cn } from "@/lib/utils";

type StatusSample = z.infer<
  typeof DashboardAPI.STATUS_HISTORY.response
>["samples"][number];

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
    return "text-success";
  }
  if (tps >= 15) {
    return "text-warning";
  }
  return "text-destructive";
};

/** 服务器行内的迷你 TPS 走势，仅用最近样本，纯位移无坐标轴 */
export const MiniTpsSpark = ({
  samples,
}: {
  samples: { tps: number | null }[];
}) => {
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
        <title>{t("近期 TPS 走势")}</title>
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
        desc={t("样本不足，等待下一次状态采集（每 60 秒一次）")}
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
          {t("当前 TPS，均值")} {avg.toFixed(1)}
        </span>
      </div>
      <svg
        aria-label={t("TPS 趋势图")}
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

export const TrendPanel = ({
  serverName,
  isLoading,
  samples,
}: {
  serverName: string | undefined;
  isLoading: boolean;
  samples: StatusSample[] | undefined;
}) => {
  const title = serverName
    ? t("TPS 趋势 · {{serverName}}", { serverName })
    : t("TPS 趋势");

  return (
    <Card className="gap-0 overflow-hidden p-0">
      <PanelHeader hint={t("最近 24 小时")} title={title} />
      {(() => {
        if (isLoading) {
          return <LoadingState />;
        }
        if (samples) {
          return <TrendChart samples={samples} />;
        }
        return (
          <EmptyState
            className="py-10"
            desc={t("选择一台在线服务器查看趋势")}
          />
        );
      })()}
    </Card>
  );
};
