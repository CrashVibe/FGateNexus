import { Plus } from "lucide-react";
import { useState } from "react";

import { BotAPI } from "#shared/model/bot/api";
import type { BotWithStatus } from "#shared/model/bot/api";
import { BotForm } from "@/components/bot/bot-form";
import type { BotFormValue } from "@/components/bot/bot-form";
import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { EmptyState } from "@/components/common/empty-state";
import { LastEventLine } from "@/components/common/last-event";
import { LoadingState } from "@/components/common/loading-state";
import { PageContent } from "@/components/layout/page-content";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { toast } from "@/components/ui/sonner";
import { useEntityStatusStream } from "@/hooks/use-status-event-stream";
import { t } from "@/i18n";
import { errorMessage } from "@/lib/http";
import { cn } from "@/lib/utils";
import {
  botsKey,
  useBots,
  useCreateBot,
  useDeleteBot,
  useToggleBot,
  useUpdateBot,
} from "@/queries/bots";

const BotCard = ({
  bot,
  onClick,
}: {
  bot: BotWithStatus;
  onClick: () => void;
}) => (
  <button
    aria-label={t("编辑机器人 #{{id}}", { id: bot.id })}
    className={cn(
      "cursor-pointer text-left transition-all duration-300 ease-in-out hover:scale-[0.99] hover:opacity-80",
      !bot.isOnline && "grayscale-[0.8]",
    )}
    onClick={onClick}
    type="button"
  >
    <Card className="gap-3 p-5">
      <div className="flex items-center gap-2">
        <span className="text-lg font-semibold"># {bot.id}</span>
        <Badge variant={bot.isOnline ? "success" : "destructive"}>
          {bot.isOnline ? t("在线") : t("离线")}
        </Badge>
        <span className="text-muted-foreground text-sm">{bot.platform}</span>
      </div>
      <div className="flex items-center justify-center py-2">
        <span className="text-primary text-2xl font-semibold">
          {bot.name || bot.platform}
        </span>
      </div>
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">{t("机器人开关")}</span>
        <Badge variant={bot.enabled ? "success" : "warning"}>
          {bot.enabled ? t("启用") : t("禁用")}
        </Badge>
      </div>
      <LastEventLine event={bot.lastEvent} />
      <span className="text-muted-foreground text-right text-xs opacity-70 select-none">
        {t("点击卡片修改配置")}
      </span>
    </Card>
  </button>
);

export const BotsPage = () => {
  const { data: botList, isLoading } = useBots();
  const createBot = useCreateBot();
  const updateBot = useUpdateBot();
  const deleteBot = useDeleteBot();
  const toggleBot = useToggleBot();

  useEntityStatusStream("bot", botsKey);

  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState<BotFormValue>({});

  const [editBot, setEditBot] = useState<BotWithStatus | null>(null);
  const [editForm, setEditForm] = useState<BotFormValue>({});
  const [confirmDelete, setConfirmDelete] = useState(false);

  const openCreate = (): void => {
    setCreateForm({});
    setCreateOpen(true);
  };

  const openEdit = (bot: BotWithStatus): void => {
    setEditBot(bot);
    setEditForm({ config: bot.config, name: bot.name, platform: bot.platform });
  };

  const handleCreate = async (): Promise<void> => {
    try {
      const parsed = BotAPI.POST.request.parse(createForm);
      await createBot.mutateAsync(parsed);
      toast.success(t("机器人创建成功"));
      setCreateOpen(false);
    } catch (error) {
      toast.error(t("创建机器人失败"), { description: errorMessage(error) });
    }
  };

  const handleSave = async (): Promise<void> => {
    if (!editBot) {
      return;
    }
    try {
      const parsed = BotAPI.PUT.request.parse(editForm);
      await updateBot.mutateAsync({ data: parsed, id: editBot.id });
      toast.success(t("机器人更新成功"));
      setEditBot(null);
    } catch (error) {
      toast.error(t("更新机器人失败"), { description: errorMessage(error) });
    }
  };

  const handleDelete = async (): Promise<void> => {
    if (!editBot) {
      return;
    }
    try {
      await deleteBot.mutateAsync(editBot.id);
      toast.success(t("机器人删除成功"));
      setEditBot(null);
    } catch (error) {
      toast.error(t("删除机器人失败"), { description: errorMessage(error) });
      throw error;
    }
  };

  const handleToggle = async (): Promise<void> => {
    if (!editBot) {
      return;
    }
    try {
      await toggleBot.mutateAsync({
        enabled: !editBot.enabled,
        id: editBot.id,
      });
      toast.success(
        t("机器人已{{v0}}", { v0: editBot.enabled ? t("禁用") : t("启用") }),
      );
      setEditBot(null);
    } catch (error) {
      toast.error(t("切换机器人状态失败"), {
        description: errorMessage(error),
      });
    }
  };

  const renderList = (): React.ReactNode => {
    if (botList === undefined) {
      return <LoadingState />;
    }
    if (botList.length === 0 && !isLoading) {
      return (
        <EmptyState
          action={
            <Button onClick={openCreate}>
              <Plus />
              {t("创建新机器人")}
            </Button>
          }
          className="mt-10"
          desc={t("暂无机器人，请先创建一个机器人")}
        />
      );
    }
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
        {botList.map((bot) => (
          <BotCard
            bot={bot}
            key={bot.id}
            onClick={() => {
              openEdit(bot);
            }}
          />
        ))}
      </div>
    );
  };

  return (
    <>
      <PageHeader
        actions={
          <Button onClick={openCreate} size="sm">
            <Plus />
            {t("创建新机器人")}
          </Button>
        }
        description={t("管理多个机器人，点击进入详细配置。")}
        title={t("机器人列表")}
      />

      <PageContent>{renderList()}</PageContent>

      <Dialog onOpenChange={setCreateOpen} open={createOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t("创建机器人")}</DialogTitle>
          </DialogHeader>
          <BotForm onChange={setCreateForm} value={createForm} />
          <DialogFooter>
            <Button
              disabled={createBot.isPending}
              onClick={() => {
                setCreateOpen(false);
              }}
              variant="outline"
            >
              {t("取消")}
            </Button>
            <Button
              loading={createBot.isPending}
              onClick={() => {
                void handleCreate();
              }}
            >
              {t("确认创建")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Sheet
        onOpenChange={(o) => {
          if (!o) {
            setEditBot(null);
          }
        }}
        open={editBot !== null}
      >
        <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
          <SheetHeader>
            <SheetTitle>{t("配置修改")}</SheetTitle>
            <SheetDescription>{t("修改机器人配置")}</SheetDescription>
          </SheetHeader>
          <div className="flex-1 overflow-y-auto">
            <BotForm isEdit onChange={setEditForm} value={editForm} />
          </div>
          <div className="flex justify-end gap-3 border-t pt-3">
            <Button
              onClick={() => {
                setConfirmDelete(true);
              }}
              variant="destructive"
            >
              {t("删除")}
            </Button>
            <Button
              loading={toggleBot.isPending}
              onClick={() => {
                void handleToggle();
              }}
              variant="secondary"
            >
              {editBot?.enabled ? t("禁用") : t("启用")}
            </Button>
            <Button
              loading={updateBot.isPending}
              onClick={() => {
                void handleSave();
              }}
            >
              {t("保存")}
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      <ConfirmDialog
        description={t("确定删除机器人「{{v0}}」吗？此操作不可恢复。", {
          v0: editBot?.name ?? "",
        })}
        onConfirm={handleDelete}
        onOpenChange={setConfirmDelete}
        open={confirmDelete}
        title={t("删除机器人")}
      />
    </>
  );
};
