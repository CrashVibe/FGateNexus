import { Plus } from "lucide-react";
import { useState } from "react";

import { BotAPI } from "#shared/model/bot/api";
import type { BotWithStatus } from "#shared/model/bot/api";
import { BotForm } from "@/components/bot/bot-form";
import type { BotFormValue } from "@/components/bot/bot-form";
import { EmptyState } from "@/components/common/empty-state";
import { LoadingState } from "@/components/common/loading-state";
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
import { errorMessage } from "@/lib/http";
import { cn } from "@/lib/utils";
import {
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
    aria-label={`编辑 Bot #${bot.id}`}
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
          {bot.isOnline ? "在线" : "离线"}
        </Badge>
        <span className="text-muted-foreground text-sm">{bot.platform}</span>
      </div>
      <div className="flex items-center justify-center py-2">
        <span className="text-primary text-2xl font-semibold">
          {bot.name || bot.platform}
        </span>
      </div>
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">机器人开关</span>
        <Badge variant={bot.enabled ? "success" : "warning"}>
          {bot.enabled ? "启用" : "禁用"}
        </Badge>
      </div>
      <span className="text-muted-foreground text-right text-xs opacity-70 select-none">
        点击卡片修改配置
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

  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState<BotFormValue>({});

  const [editBot, setEditBot] = useState<BotWithStatus | null>(null);
  const [editForm, setEditForm] = useState<BotFormValue>({});

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
      toast.success("Bot 实例创建成功");
      setCreateOpen(false);
    } catch (error) {
      toast.error("创建 Bot 实例失败", { description: errorMessage(error) });
    }
  };

  const handleSave = async (): Promise<void> => {
    if (!editBot) {
      return;
    }
    try {
      const parsed = BotAPI.PUT.request.parse(editForm);
      await updateBot.mutateAsync({ data: parsed, id: editBot.id });
      toast.success("Bot 实例更新成功");
      setEditBot(null);
    } catch (error) {
      toast.error("操作失败", { description: errorMessage(error) });
    }
  };

  const handleDelete = async (): Promise<void> => {
    if (!editBot) {
      return;
    }
    try {
      await deleteBot.mutateAsync(editBot.id);
      toast.success("Bot 实例删除成功");
      setEditBot(null);
    } catch (error) {
      toast.error("操作失败", { description: errorMessage(error) });
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
      toast.success(`Bot 实例已${editBot.enabled ? "禁用" : "启用"}成功`);
      setEditBot(null);
    } catch (error) {
      toast.error("操作失败", { description: errorMessage(error) });
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
              创建新 Bot 实例
            </Button>
          }
          className="mt-10"
          desc="暂无 Bot 实例，请先创建一个 Bot 实例"
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
          <Button onClick={openCreate}>
            <Plus />
            创建新 Bot 实例
          </Button>
        }
        description="管理多个 Bot 实例，点击进入详细配置。"
        title="Bot 实例列表"
      />

      <div className="scrollbar-custom flex-1 overflow-y-auto">
        <div className="mx-auto max-w-7xl px-4 py-8 lg:px-6">
          {renderList()}
        </div>
      </div>

      <Dialog onOpenChange={setCreateOpen} open={createOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>创建 Bot 实例</DialogTitle>
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
              取消
            </Button>
            <Button
              disabled={createBot.isPending}
              onClick={() => {
                void handleCreate();
              }}
            >
              确认创建
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
            <SheetTitle>配置修改</SheetTitle>
            <SheetDescription>修改 Bot 实例配置</SheetDescription>
          </SheetHeader>
          <div className="flex-1 overflow-y-auto">
            <BotForm isEdit onChange={setEditForm} value={editForm} />
          </div>
          <div className="flex justify-end gap-3 border-t pt-3">
            <Button
              onClick={() => {
                void handleDelete();
              }}
              variant="destructive"
            >
              删除
            </Button>
            <Button
              onClick={() => {
                void handleToggle();
              }}
              variant="secondary"
            >
              {editBot?.enabled ? "禁用" : "启用"}
            </Button>
            <Button
              onClick={() => {
                void handleSave();
              }}
            >
              保存
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
};
