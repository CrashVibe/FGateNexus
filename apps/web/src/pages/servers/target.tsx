import { Link, useParams } from "@tanstack/react-router";
import { isEqual } from "lodash-es";
import { Activity, Bot, PlugZap, RefreshCw, Settings } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import type { targetResponse } from "#shared/model/server/schema/target";
import { targetSchemaRequest } from "#shared/model/server/schema/target";
import { EmptyState } from "@/components/common/empty-state";
import { LoadingState } from "@/components/common/loading-state";
import { ServerHeader } from "@/components/layout/server-header";
import { ChannelSelector } from "@/components/target/channel-selector";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/sonner";
import { useRegisterPageState } from "@/hooks/use-page-state";
import { TargetData } from "@/lib/api";
import { errorMessage } from "@/lib/http";
import { useBot } from "@/queries/bots";
import { useServer } from "@/queries/servers";
import { useTargets } from "@/queries/targets";

const toSelectionKey = (
  t: Pick<targetResponse, "channelId" | "guildId" | "type">,
): string => `${t.type}|${t.guildId ?? ""}|${t.channelId}`;

const parseSelectionKey = (
  value: string,
): { channelId: string; guildId: string | null; type: "group" | "private" } => {
  const [type, guildId, ...rest] = value.split("|");
  return {
    channelId: rest.join("|"),
    guildId: guildId || null,
    type: type === "private" ? "private" : "group",
  };
};

export const ServerTargetPage = () => {
  const { id } = useParams({ from: "/dashboard/servers/$id/target" });
  const serverId = Number(id);

  const { data: server, isLoading: serverLoading } = useServer(serverId);
  const { data: bot } = useBot(server?.botId ?? null);
  const { data: targets, refetch: refetchTargets } = useTargets(serverId);

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [original, setOriginal] = useState<Set<string>>(new Set());
  const [submitting, setSubmitting] = useState(false);
  const [channelsLoading, setChannelsLoading] = useState(false);

  useEffect(() => {
    if (targets) {
      const keys = new Set(targets.map(toSelectionKey));
      setOriginal(keys);
      setSelected(new Set(keys));
    }
  }, [targets]);

  const isDirty = useMemo(
    () => !isEqual([...selected].toSorted(), [...original].toSorted()),
    [selected, original],
  );

  const handleSubmit = async (): Promise<void> => {
    if (!server?.botId) {
      return;
    }
    const toCreate = [...selected].filter((k) => !original.has(k));
    const toDelete = [...original].filter((k) => !selected.has(k));
    if (toCreate.length === 0 && toDelete.length === 0) {
      return;
    }
    setSubmitting(true);
    try {
      if (toCreate.length > 0) {
        const payload = toCreate.map((k) => {
          const p = parseSelectionKey(k);
          return targetSchemaRequest.parse({
            channelId: p.channelId.trim(),
            guildId: p.guildId,
            type: p.type,
          });
        });
        await TargetData.creates(
          serverId,
          payload as [(typeof payload)[number], ...(typeof payload)[number][]],
        );
      }
      if (toDelete.length > 0) {
        const all = await TargetData.gets(serverId);
        const delSet = new Set(toDelete);
        const ids = all
          .filter((t) => delSet.has(toSelectionKey(t)))
          .map((t) => t.id);
        if (ids.length > 0) {
          await TargetData.deletes(serverId, {
            ids: ids as [string, ...string[]],
          });
        }
      }
      toast.success("配置已保存");
      await refetchTargets();
    } catch (error) {
      toast.error("保存配置失败", { description: errorMessage(error) });
    } finally {
      setSubmitting(false);
    }
  };

  useRegisterPageState(
    isDirty,
    async () => handleSubmit(),
    () => {
      setSelected(new Set(original));
    },
  );

  const renderBody = (): React.ReactNode => {
    if (serverLoading || server === undefined) {
      return <LoadingState />;
    }
    if (!server.botId) {
      return (
        <EmptyState
          action={
            <Button asChild>
              <Link params={{ id }} to="/servers/$id/general">
                <Settings />
                前往配置 Bot 实例
              </Link>
            </Button>
          }
          className="py-16"
          desc="请先前往通用设置配置 Bot 实例，再管理目标频道"
          icon={<Bot className="text-muted-foreground size-12" />}
          title="尚未配置 Bot 实例"
        />
      );
    }
    if (bot && !bot.isOnline) {
      return (
        <EmptyState
          action={
            <Button asChild>
              <Link to="/bots">
                <Activity />
                前往检查 Bot 状态
              </Link>
            </Button>
          }
          className="py-16"
          desc="目标频道配置需要 Bot 在线才能加载，请确保 Bot 已正确运行"
          icon={<PlugZap className="text-muted-foreground size-12" />}
          title="Bot 实例当前离线"
        />
      );
    }
    if (!bot) {
      return <LoadingState />;
    }
    return (
      <div className="space-y-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <h2 className="text-lg font-semibold">目标频道</h2>
              {selected.size > 0 ? (
                <Badge variant="success">已选 {selected.size} 个</Badge>
              ) : null}
            </div>
            <p className="text-muted-foreground mt-1 text-sm">
              从 Bot 实例中选择要转发消息的群组、频道或私聊
            </p>
          </div>
          <Button
            disabled={isDirty || channelsLoading}
            onClick={() => {
              void refetchTargets();
            }}
            size="sm"
            variant="ghost"
          >
            <RefreshCw />
            刷新
          </Button>
        </div>

        <ChannelSelector
          botId={server.botId}
          onChange={setSelected}
          onLoadingChange={setChannelsLoading}
          platform={bot.platform}
          selected={selected}
        />

        <div className="flex justify-end gap-2">
          <Button
            disabled={!isDirty || submitting}
            onClick={() => {
              setSelected(new Set(original));
            }}
            variant="secondary"
          >
            取消更改
          </Button>
          <Button
            disabled={!isDirty || submitting}
            onClick={() => {
              void handleSubmit();
            }}
          >
            保存配置
          </Button>
        </div>
      </div>
    );
  };

  return (
    <>
      <ServerHeader />
      <div className="scrollbar-custom flex-1 overflow-y-auto">
        <div className="mx-auto max-w-5xl px-4 py-8 lg:px-6">
          {renderBody()}
        </div>
      </div>
    </>
  );
};
