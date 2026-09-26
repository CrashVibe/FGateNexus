import { useNavigate } from "@tanstack/react-router";
import { ChevronRight, Circle, CircleCheck } from "lucide-react";
import type { z } from "zod";

import type { DashboardAPI } from "#shared/model/dashboard";
import { PanelHeader } from "@/components/dashboard/panel-header";
import { Card } from "@/components/ui/card";
import { t } from "@/i18n";
import { cn } from "@/lib/utils";

type DashboardServer = z.infer<typeof DashboardAPI.SERVERS.response>[number];
type Summary = z.infer<typeof DashboardAPI.SUMMARY.response>;

// 上手清单：全部完成后自动消失
export const SetupChecklist = ({
  servers,
  summary,
}: {
  servers: DashboardServer[];
  summary: Summary;
}) => {
  const navigate = useNavigate();
  const [firstServer] = servers;
  const steps = [
    {
      done: summary.bots.online > 0,
      go: () => navigate({ to: "/bots" }),
      label: t("创建一个机器人，并让它上线"),
    },
    {
      done: summary.servers.total > 0,
      go: () => navigate({ to: "/servers" }),
      label: t("创建一台服务器"),
    },
    {
      done: summary.servers.online > 0,
      go: () =>
        firstServer
          ? navigate({
              params: { id: String(firstServer.id) },
              to: "/servers/$id/general",
            })
          : navigate({ to: "/servers" }),
      label: t("在 MC 服务器装好 FGateClient 并连上"),
    },
    {
      done: summary.chatSyncTargets > 0,
      go: () =>
        firstServer
          ? navigate({
              params: { id: String(firstServer.id) },
              to: "/servers/$id/target",
            })
          : navigate({ to: "/servers" }),
      label: t("给至少一个群聊开启消息互通"),
    },
  ];
  const doneCount = steps.filter((s) => s.done).length;
  if (doneCount === steps.length) {
    return null;
  }

  return (
    <Card className="gap-0 p-0">
      <PanelHeader
        hint={`${doneCount} / ${steps.length}`}
        title={t("还差几步就能用了……才不是特意提醒你的")}
      />
      <div className="divide-y">
        {steps.map((step) => (
          <button
            className="flex w-full hover:bg-gray-100 active:bg-gray-300 items-center gap-3 px-4 py-3 text-left text-sm focus-visible:outline-2 focus-visible:outline-offset-2"
            key={step.label}
            onClick={() => {
              void step.go();
            }}
            type="button"
          >
            {step.done ? (
              <CircleCheck className="size-4 text-success" />
            ) : (
              <Circle className="text-muted-foreground size-4" />
            )}
            <span
              className={cn(
                "flex-1",
                step.done && "text-muted-foreground line-through",
              )}
            >
              {step.label}
            </span>
            {step.done ? null : (
              <ChevronRight className="text-muted-foreground size-4" />
            )}
          </button>
        ))}
      </div>
    </Card>
  );
};
