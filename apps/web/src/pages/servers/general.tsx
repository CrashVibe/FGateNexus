import { useNavigate, useParams } from "@tanstack/react-router";
import { Copy, Download, RefreshCw, Trash2, X } from "lucide-react";
import { useState } from "react";

import { ConfirmDialog } from "@/components/common/confirm-dialog";
import {
  SettingsRow,
  SettingsSection,
} from "@/components/common/settings-section";
import { ServerSettingsPage } from "@/components/layout/server-settings-page";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "@/components/ui/sonner";
import { useServerForm } from "@/hooks/use-server-form";
import { useEntityStatusStream } from "@/hooks/use-status-event-stream";
import { t } from "@/i18n";
import { GeneralData } from "@/lib/api";
import { errorMessage } from "@/lib/http";
import { useBots } from "@/queries/bots";
import { serverKey, useDeleteServer, useServer } from "@/queries/servers";

const PLUGIN_RELEASES = "https://github.com/CrashVibe/FGateClient/releases";

// 插件接入：把这段贴进 plugins/FGateClient/config.yml
const ConnectSection = ({
  isOnline,
  onRegenerate,
  token,
}: {
  isOnline: boolean;
  onRegenerate: () => void;
  token: string;
}) => {
  const wsUrl = `${location.protocol === "https:" ? "wss" : "ws"}://${location.host}/api`;
  const snippet = `websocket:\n  url: ${wsUrl}\n  token: ${token}`;

  const copy = async (): Promise<void> => {
    try {
      await navigator.clipboard.writeText(snippet);
      toast.success(t("复制好了，去贴进插件配置吧～"));
    } catch {
      toast.error(t("复制失败，小 clipboard 罢工了！"));
    }
  };

  return (
    <SettingsSection
      description={t(
        "把下面这段贴进 plugins/FGateClient/config.yml，然后重载插件",
      )}
      title={
        <span className="flex items-center gap-2">
          {t("接入 FGateClient")}
          <Badge variant={isOnline ? "success" : "secondary"}>
            {isOnline ? t("已连接") : t("等待连接中…")}
          </Badge>
        </span>
      }
    >
      <div className="space-y-3 py-4">
        <pre className="bg-muted overflow-x-auto rounded-md px-3 py-2 font-mono text-xs">
          {snippet}
        </pre>
        <div className="flex flex-wrap gap-2">
          <Button
            onClick={() => {
              void copy();
            }}
            size="sm"
          >
            <Copy />
            {t("复制配置")}
          </Button>
          <Button asChild size="sm" variant="outline">
            <a href={PLUGIN_RELEASES} rel="noreferrer" target="_blank">
              <Download />
              {t("下载插件")}
            </a>
          </Button>
          <Button onClick={onRegenerate} size="sm" variant="outline">
            <RefreshCw />
            {t("重新生成 Token")}
          </Button>
        </div>
      </div>
    </SettingsSection>
  );
};

export const ServerGeneralPage = () => {
  const { id } = useParams({ from: "/dashboard/servers/$id/general" });
  const serverId = Number(id);
  const navigate = useNavigate();

  const { data: server } = useServer(serverId);
  const { data: bots } = useBots();
  const deleteServer = useDeleteServer();
  useEntityStatusStream("server", serverKey(serverId));

  const {
    form: draft,
    guard,
    setForm,
    section,
  } = useServerForm(
    server,
    (s) => ({ botId: s.botId, name: s.name }),
    async (f) => {
      await GeneralData.patch(serverId, f);
    },
  );

  const [showDelete, setShowDelete] = useState(false);
  const [showRegenerate, setShowRegenerate] = useState(false);

  const regenerateToken = async (): Promise<void> => {
    try {
      await GeneralData.patch(serverId, { token: crypto.randomUUID() });
      toast.success(t("新 Token 到手，旧的已经作废啦"));
    } catch (error) {
      toast.error(t("重新生成失败"), { description: errorMessage(error) });
      throw error;
    }
  };
  const [showBotChange, setShowBotChange] = useState(false);
  const [pendingBotId, setPendingBotId] = useState<number | null>(null);

  const selectedBotId = draft?.botId ?? undefined;

  const requestBotChange = (next?: number): void => {
    if (!draft) {
      return;
    }
    // 没有群聊可丢，直接换
    if (!server?.targets.length) {
      setForm({ ...draft, botId: next ?? null });
      return;
    }
    setPendingBotId(next ?? null);
    setShowBotChange(true);
  };

  const confirmBotChange = (): void => {
    if (draft) {
      setForm({ ...draft, botId: pendingBotId });
    }
  };

  const confirmDelete = async (): Promise<void> => {
    try {
      await deleteServer.mutateAsync(serverId);
      toast.success(t("服务器已删除～"));
      await navigate({ to: "/servers" });
    } catch (error) {
      toast.error(t("删除服务器失败"), { description: errorMessage(error) });
      throw error;
    }
  };

  return (
    <>
      <ServerSettingsPage guard={guard} value={draft}>
        {(form) => (
          <>
            {server ? (
              <ConnectSection
                isOnline={server.isOnline}
                onRegenerate={() => {
                  setShowRegenerate(true);
                }}
                token={server.token}
              />
            ) : null}
            <SettingsSection
              description={t("修改服务器基础信息")}
              save={section(["name"])}
              title={t("基础信息")}
            >
              <SettingsRow
                description={t("在管理面板中显示的名称")}
                label={t("服务器名称")}
              >
                <Input
                  className="w-full sm:w-56"
                  onChange={(e) => {
                    setForm({ ...form, name: e.target.value });
                  }}
                  placeholder={t("请输入服务器名称")}
                  value={form.name ?? ""}
                />
              </SettingsRow>
            </SettingsSection>

            <SettingsSection
              description={t("为此服务器关联一个聊天平台机器人")}
              save={section(["botId"])}
              title={t("机器人")}
            >
              <SettingsRow
                description={t("更换机器人会移除已添加的群聊")}
                label={t("关联机器人")}
              >
                <div className="flex w-full items-center gap-1 sm:w-56">
                  <Select
                    onValueChange={(v) => {
                      requestBotChange(Number(v));
                    }}
                    value={
                      selectedBotId === undefined ? "" : String(selectedBotId)
                    }
                  >
                    <SelectTrigger className="w-full min-w-0 flex-1 [&>span]:truncate">
                      <SelectValue placeholder={t("请选择机器人")} />
                    </SelectTrigger>
                    <SelectContent>
                      {(bots ?? []).map((bot) => (
                        <SelectItem key={bot.id} value={String(bot.id)}>
                          {bot.name} · {bot.platform} [
                          {bot.isOnline ? t("在线") : t("离线")}
                          {bot.enabled ? "" : t(" · 已禁用")}]
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {selectedBotId === undefined ? null : (
                    <Button
                      aria-label={t("清除选择")}
                      onClick={() => {
                        requestBotChange();
                      }}
                      size="icon"
                      variant="ghost"
                    >
                      <X />
                    </Button>
                  )}
                </div>
              </SettingsRow>
            </SettingsSection>

            <SettingsSection danger title={t("危险操作")}>
              <SettingsRow
                description={t("此操作不可逆，将清除所有关联配置")}
                label={t("删除此服务器")}
              >
                <Button
                  onClick={() => {
                    setShowDelete(true);
                  }}
                  size="sm"
                  variant="destructive"
                >
                  <Trash2 />
                  {t("删除服务器")}
                </Button>
              </SettingsRow>
            </SettingsSection>
          </>
        )}
      </ServerSettingsPage>

      <ConfirmDialog
        confirmText={t("重新生成")}
        description={t(
          "旧 Token 会立刻作废，已连接的插件会被断开，需要把新配置重新贴进插件。",
        )}
        onConfirm={regenerateToken}
        onOpenChange={setShowRegenerate}
        open={showRegenerate}
        title={t("重新生成 Token？")}
      />

      <ConfirmDialog
        description={t("确定要删除此服务器吗？删除后将无法恢复。")}
        onConfirm={confirmDelete}
        onOpenChange={setShowDelete}
        open={showDelete}
        title={t("确认删除")}
      />

      <ConfirmDialog
        confirmText={t("确认")}
        description={t(
          "{{v0}}保存后会移除该服务器下的 {{v1}} 个群聊（{{v2}}）及其配置，且无法恢复。",
          {
            v0:
              pendingBotId === null
                ? t("确定要取消关联机器人吗？")
                : t("确定要更换机器人吗？"),
            v1: server?.targets.length ?? 0,
            v2: (server?.targets ?? [])
              .map((item) => item.channelId)
              .join("、"),
          },
        )}
        onConfirm={confirmBotChange}
        onOpenChange={setShowBotChange}
        open={showBotChange}
        title={t("确认更改机器人")}
      />
    </>
  );
};
