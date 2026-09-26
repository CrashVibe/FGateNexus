import { useQueryClient } from "@tanstack/react-query";
import { Link, useParams } from "@tanstack/react-router";
import { differenceWith, isEqual } from "lodash-es";
import {
  Activity,
  Bot,
  PlugZap,
  RefreshCw,
  Settings,
  Settings2,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import type { targetResponse } from "#shared/model/server/schema/target";
import { targetSchemaRequest } from "#shared/model/server/schema/target";
import { EmptyState } from "@/components/common/empty-state";
import { LoadingState } from "@/components/common/loading-state";
import { SettingsSection } from "@/components/common/settings-section";
import { PageContent } from "@/components/layout/page-content";
import { ServerHeader } from "@/components/layout/server-header";
import {
  ChannelSelector,
  useChannelItems,
} from "@/components/target/channel-selector";
import { TargetCommandFields } from "@/components/target/target-command-fields";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import { useUnsavedGuard } from "@/hooks/use-unsaved-guard";
import { t } from "@/i18n";
import { TargetConfigData, TargetData } from "@/lib/api";
import { useBot } from "@/queries/bots";
import { serverKey, useServer } from "@/queries/servers";
import { useTargets } from "@/queries/targets";

type Config = targetResponse["config"];

const toSelectionKey = (
  target: Pick<targetResponse, "channelId" | "guildId" | "type">,
): string => `${target.type}|${target.guildId ?? ""}|${target.channelId}`;

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

// 表格列：读/写 target.config 里的一个开关
const COLUMNS: {
  label: string;
  get: (c: Config) => boolean;
  set: (c: Config, v: boolean) => Config;
}[] = [
  {
    get: (c) => c.chatSyncConfigSchema.enabled,
    label: t("消息互通"),
    set: (c, v) => ({ ...c, chatSyncConfigSchema: { enabled: v } }),
  },
  {
    get: (c) => c.NotifyConfigSchema.player_notify,
    label: t("进出通知"),
    set: (c, v) => ({
      ...c,
      NotifyConfigSchema: { ...c.NotifyConfigSchema, player_notify: v },
    }),
  },
  {
    get: (c) => c.NotifyConfigSchema.player_disappoint_notify,
    label: t("死亡通知"),
    set: (c, v) => ({
      ...c,
      NotifyConfigSchema: {
        ...c.NotifyConfigSchema,
        player_disappoint_notify: v,
      },
    }),
  },
  {
    get: (c) => c.CommandConfigSchema.enabled,
    label: t("远程指令"),
    set: (c, v) => ({
      ...c,
      CommandConfigSchema: { ...c.CommandConfigSchema, enabled: v },
    }),
  },
];

// 宽屏是表格；窄屏每行拆成「名字 + 2×2 开关」的小卡（靠 sm:contents 复用同一份 DOM）
const GRID =
  "sm:grid sm:grid-cols-[minmax(0,1fr)_repeat(4,5.5rem)_2rem] sm:items-center sm:gap-2";

export const ServerTargetPage = () => {
  const { id } = useParams({ from: "/dashboard/servers/$id/target" });
  const serverId = Number(id);

  const queryClient = useQueryClient();
  const { data: server, isLoading: serverLoading } = useServer(serverId);
  const { data: bot } = useBot(server?.botId ?? null);
  const { data: targets, refetch: refetchTargets } = useTargets(serverId);
  const botOnline = bot?.isOnline === true;
  const { items: channelItems } = useChannelItems(
    bot?.id,
    bot?.platform,
    botOnline,
  );
  const names = useMemo(
    () => new Map(channelItems.map((i) => [i.value, i.label])),
    [channelItems],
  );

  // 卡片一：每个群聊的功能开关
  const [rows, setRows] = useState<targetResponse[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  // 卡片二：添加/移除群聊
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [channelsLoading, setChannelsLoading] = useState(false);

  const original = useMemo(
    () => new Set((targets ?? []).map(toSelectionKey)),
    [targets],
  );
  useEffect(() => {
    if (targets) {
      setRows(structuredClone(targets));
      setSelected(new Set(targets.map(toSelectionKey)));
    }
  }, [targets]);

  const rowsDirty = targets !== undefined && !isEqual(rows, targets);
  const selectionDirty = !isEqual(
    [...selected].toSorted(),
    [...original].toSorted(),
  );
  const guard = useUnsavedGuard(rowsDirty || selectionDirty);

  const refresh = async (): Promise<void> => {
    await refetchTargets();
    await queryClient.invalidateQueries({ queryKey: serverKey(serverId) });
  };

  const saveRows = async (): Promise<void> => {
    const changed = differenceWith(rows, targets ?? [], isEqual).map(
      (item) => ({
        config: item.config,
        id: item.id,
      }),
    );
    if (changed.length > 0) {
      await TargetConfigData.patch(serverId, {
        items: changed as [(typeof changed)[number], ...typeof changed],
      });
    }
    await refresh();
  };

  const saveSelection = async (): Promise<void> => {
    const toCreate = [...selected].filter((k) => !original.has(k));
    const toDelete = [...original].filter((k) => !selected.has(k));
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
    const delSet = new Set(toDelete);
    const ids = (targets ?? [])
      .filter((item) => delSet.has(toSelectionKey(item)))
      .map((item) => item.id);
    if (ids.length > 0) {
      await TargetData.deletes(serverId, { ids: ids as [string, ...string[]] });
    }
    await refresh();
  };

  const updateRow = (targetId: string, config: Config): void => {
    setRows((prev) =>
      prev.map((item) => (item.id === targetId ? { ...item, config } : item)),
    );
  };
  const editing = rows.find((item) => item.id === editingId) ?? null;

  const renderTable = (): React.ReactNode => {
    if (rows.length === 0) {
      return (
        <p className="text-muted-foreground py-8 text-center text-sm">
          {t("还没有群聊呢，先在下面添加一个吧")}
        </p>
      );
    }
    return (
      <>
        <div
          className={`${GRID} text-muted-foreground hidden py-2 text-xs font-medium`}
        >
          <span>{t("群聊")}</span>
          {COLUMNS.map((col) => (
            <span className="text-center" key={col.label}>
              {col.label}
            </span>
          ))}
          <span />
        </div>
        {rows.map((row) => {
          const name = names.get(toSelectionKey(row));
          return (
            <div className={`${GRID} py-3`} key={row.id}>
              <div className="flex items-center justify-between gap-2 sm:contents">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">
                    {name ?? row.channelId}
                  </p>
                  <p className="text-muted-foreground truncate text-xs">
                    {row.type === "group" ? t("群聊") : t("私聊")}
                    {/* 没拿到群名时标题已经是 ID，别再重复一遍 */}
                    {name ? ` · ${row.channelId}` : null}
                  </p>
                </div>
                <Button
                  aria-label={t("远程指令设置")}
                  className="sm:order-last"
                  onClick={() => {
                    setEditingId(row.id);
                  }}
                  size="icon"
                  title={t("远程指令设置")}
                  variant="ghost"
                >
                  <Settings2 />
                </Button>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-x-6 gap-y-3 sm:contents">
                {COLUMNS.map((col) => (
                  <label
                    className="flex items-center justify-between gap-2 text-sm sm:justify-center"
                    key={col.label}
                  >
                    <span className="sm:hidden">{col.label}</span>
                    <Switch
                      aria-label={`${name ?? row.channelId} ${col.label}`}
                      checked={col.get(row.config)}
                      onCheckedChange={(v) => {
                        updateRow(row.id, col.set(row.config, v));
                      }}
                    />
                  </label>
                ))}
              </div>
            </div>
          );
        })}
      </>
    );
  };

  const renderSelector = (): React.ReactNode => {
    if (!(bot && server?.botId)) {
      return <LoadingState />;
    }
    if (!botOnline) {
      return (
        <EmptyState
          action={
            <Button asChild>
              <Link to="/bots">
                <Activity />
                {t("前往检查机器人状态")}
              </Link>
            </Button>
          }
          className="py-10"
          desc={t(
            "添加新群聊需要机器人在线才能拉取列表；上面已有群聊的开关照常可改",
          )}
          icon={<PlugZap className="text-muted-foreground size-12" />}
          title={t("机器人当前离线")}
        />
      );
    }
    return (
      <div className="space-y-3 py-4">
        <div className="flex justify-end">
          <Button
            disabled={selectionDirty || channelsLoading}
            onClick={() => {
              void refetchTargets();
              void queryClient.invalidateQueries({
                queryKey: ["channels", bot.id, bot.platform],
              });
            }}
            size="sm"
            variant="ghost"
          >
            <RefreshCw />
            {t("刷新")}
          </Button>
        </div>
        <ChannelSelector
          botId={bot.id}
          onChange={setSelected}
          onLoadingChange={setChannelsLoading}
          platform={bot.platform}
          selected={selected}
        />
      </div>
    );
  };

  const renderBody = (): React.ReactNode => {
    if (serverLoading || server === undefined || targets === undefined) {
      return <LoadingState />;
    }
    if (!server.botId) {
      return (
        <EmptyState
          action={
            <Button asChild>
              <Link params={{ id }} to="/servers/$id/general">
                <Settings />
                {t("前往配置机器人")}
              </Link>
            </Button>
          }
          className="py-16"
          desc={t("请先前往基础设置配置机器人，再管理群聊")}
          icon={<Bot className="text-muted-foreground size-12" />}
          title={t("尚未配置机器人")}
        />
      );
    }
    return (
      <div className="space-y-8">
        <SettingsSection
          description={t("每个群聊要开哪些功能，都在这一张表里")}
          save={{ dirty: rowsDirty, onSave: saveRows }}
          title={t("群聊连接")}
        >
          {renderTable()}
        </SettingsSection>
        <SettingsSection
          description={t("从机器人能看到的群组、频道或私聊里勾选")}
          save={
            botOnline
              ? { dirty: selectionDirty, onSave: saveSelection }
              : undefined
          }
          title={t("添加 / 移除群聊")}
        >
          {renderSelector()}
        </SettingsSection>
      </div>
    );
  };

  return (
    <>
      {guard}
      <ServerHeader width="settings" />
      <PageContent width="settings">{renderBody()}</PageContent>

      <Sheet
        onOpenChange={(o) => {
          if (!o) {
            setEditingId(null);
          }
        }}
        open={editing !== null}
      >
        <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
          <SheetHeader>
            <SheetTitle>
              {t("远程指令 ·")}{" "}
              {editing
                ? (names.get(toSelectionKey(editing)) ?? editing.channelId)
                : ""}
            </SheetTitle>
          </SheetHeader>
          {editing ? (
            <div className="px-4">
              <TargetCommandFields
                botId={bot?.id}
                onChange={(config) => {
                  updateRow(editing.id, config);
                }}
                platform={bot?.platform}
                target={editing}
              />
            </div>
          ) : null}
        </SheetContent>
      </Sheet>
    </>
  );
};
