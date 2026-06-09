import { useNavigate, useParams } from "@tanstack/react-router";
import { Trash2, X } from "lucide-react";
import { useState } from "react";

import { LoadingState } from "@/components/common/loading-state";
import {
  SettingsRow,
  SettingsSection,
} from "@/components/common/settings-section";
import { ServerHeader } from "@/components/layout/server-header";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { GeneralData } from "@/lib/api";
import { errorMessage } from "@/lib/http";
import { useBots } from "@/queries/bots";
import { useDeleteServer, useServer } from "@/queries/servers";

export const ServerGeneralPage = () => {
  const { id } = useParams({ from: "/dashboard/servers/$id/general" });
  const serverId = Number(id);
  const navigate = useNavigate();

  const { data: server, refetch } = useServer(serverId);
  const { data: bots } = useBots();
  const deleteServer = useDeleteServer();

  const { form, setForm } = useServerForm(
    server,
    (s) => ({ botId: s.botId, name: s.name, token: s.token }),
    async (f) => {
      await GeneralData.patch(serverId, f);
      await refetch();
    },
  );

  const [showDelete, setShowDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showBotChange, setShowBotChange] = useState(false);
  const [pendingBotId, setPendingBotId] = useState<number | null>(null);

  const selectedBotId = form?.botId ?? undefined;

  const requestBotChange = (next?: number): void => {
    if (!form) {
      return;
    }
    if (selectedBotId === undefined && next !== undefined) {
      setForm({ ...form, botId: next });
      return;
    }
    setPendingBotId(next ?? null);
    setShowBotChange(true);
  };

  const confirmBotChange = (): void => {
    if (form) {
      setForm({ ...form, botId: pendingBotId });
    }
    setShowBotChange(false);
  };

  const confirmDelete = async (): Promise<void> => {
    setDeleting(true);
    try {
      await deleteServer.mutateAsync(serverId);
      toast.success("服务器已删除～");
      setShowDelete(false);
      await navigate({ to: "/" });
    } catch (error) {
      toast.error("删除服务器失败", { description: errorMessage(error) });
    } finally {
      setDeleting(false);
    }
  };

  return (
    <>
      <ServerHeader />
      <div className="scrollbar-custom flex-1 overflow-y-auto">
        <div className="mx-auto max-w-2xl px-4 py-8 lg:px-6">
          {form ? (
            <div className="space-y-8">
              <SettingsSection
                description="修改服务器基础信息"
                title="基础信息"
              >
                <SettingsRow
                  description="在管理面板中显示的名称"
                  label="服务器名称"
                >
                  <Input
                    className="w-60"
                    onChange={(e) => {
                      setForm({ ...form, name: e.target.value });
                    }}
                    placeholder="请输入服务器名称"
                    value={form.name ?? ""}
                  />
                </SettingsRow>
                <SettingsRow
                  description="FGateClient 使用此令牌建立连接"
                  label="Token"
                >
                  <Input
                    className="w-60"
                    onChange={(e) => {
                      setForm({ ...form, token: e.target.value });
                    }}
                    placeholder="请输入服务器 Token"
                    value={form.token ?? ""}
                  />
                </SettingsRow>
              </SettingsSection>

              <SettingsSection
                description="为此服务器绑定聊天平台机器人"
                title="Bot 实例"
              >
                <SettingsRow
                  description="更换 Bot 将自动清空目标频道配置"
                  label="绑定 Bot"
                >
                  <div className="flex items-center gap-2">
                    <Select
                      onValueChange={(v) => {
                        requestBotChange(Number(v));
                      }}
                      value={
                        selectedBotId === undefined ? "" : String(selectedBotId)
                      }
                    >
                      <SelectTrigger className="w-52">
                        <SelectValue placeholder="请选择 Bot 实例" />
                      </SelectTrigger>
                      <SelectContent>
                        {(bots ?? []).map((bot) => (
                          <SelectItem key={bot.id} value={String(bot.id)}>
                            #{bot.id} - {bot.platform} [
                            {bot.isOnline ? "在线" : "离线"}
                            {bot.enabled ? "" : " · 已禁用"}]
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {selectedBotId === undefined ? null : (
                      <Button
                        aria-label="清除选择"
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

              <SettingsSection danger title="危险操作">
                <SettingsRow
                  description="此操作不可逆，将清除所有关联配置"
                  label="删除此服务器"
                >
                  <Button
                    onClick={() => {
                      setShowDelete(true);
                    }}
                    size="sm"
                    variant="destructive"
                  >
                    <Trash2 />
                    删除服务器
                  </Button>
                </SettingsRow>
              </SettingsSection>
            </div>
          ) : (
            <LoadingState />
          )}
        </div>
      </div>

      <Dialog onOpenChange={setShowDelete} open={showDelete}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>确认删除</DialogTitle>
            <DialogDescription>
              确定要删除此服务器吗？删除后将无法恢复。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              onClick={() => {
                setShowDelete(false);
              }}
              variant="outline"
            >
              取消
            </Button>
            <Button
              disabled={deleting}
              onClick={() => {
                void confirmDelete();
              }}
              variant="destructive"
            >
              确认删除
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog onOpenChange={setShowBotChange} open={showBotChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>确认更改 Bot 实例</DialogTitle>
            <DialogDescription>
              {pendingBotId === null
                ? "确定要清除 Bot 实例绑定吗？"
                : "确定要更改 Bot 实例吗？"}
              此操作将自动清理该服务器下的所有目标配置，且无法恢复。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              onClick={() => {
                setShowBotChange(false);
              }}
              variant="outline"
            >
              取消
            </Button>
            <Button onClick={confirmBotChange} variant="destructive">
              确认
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
