import { zodResolver } from "@hookform/resolvers/zod";
import { Plus } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import type { z } from "zod";

import { ServersAPI } from "#shared/model/server/api";
import { EmptyState } from "@/components/common/empty-state";
import { LoadingState } from "@/components/common/loading-state";
import { PageHeader } from "@/components/layout/page-header";
import { ServerCard } from "@/components/server-card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/components/ui/sonner";
import { errorMessage } from "@/lib/http";
import { useCreateServer, useServers } from "@/queries/servers";

type FormData = z.infer<typeof ServersAPI.POST.request>;

export const ServersPage = () => {
  const { data: serverList, isLoading } = useServers();
  const createServer = useCreateServer();
  const [open, setOpen] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(ServersAPI.POST.request),
  });

  const openModal = (): void => {
    reset({ servername: "", token: crypto.randomUUID() });
    setOpen(true);
  };

  const onSubmit = handleSubmit(async (data) => {
    try {
      await createServer.mutateAsync(data);
      toast.success("服务器创建成功～");
      setOpen(false);
    } catch (error) {
      toast.error("创建服务器失败", { description: errorMessage(error) });
    }
  });

  const renderList = (): React.ReactNode => {
    if (serverList === undefined) {
      return <LoadingState />;
    }
    if (serverList.length === 0 && !isLoading) {
      return (
        <EmptyState
          action={
            <Button onClick={openModal}>
              <Plus />
              创建服务器
            </Button>
          }
          className="mt-10"
          desc="暂无服务器，请先创建一个服务器"
        />
      );
    }
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
        {serverList.map((server) => (
          <ServerCard key={server.id} server={server} />
        ))}
      </div>
    );
  };

  return (
    <>
      <PageHeader
        actions={
          <Button onClick={openModal} size="sm">
            <Plus />
            创建服务器
          </Button>
        }
        description="管理你的服务器，点击卡片进入详细配置"
        title="服务器列表"
      />

      <div className="scrollbar-custom flex-1 overflow-y-auto">
        <div className="mx-auto max-w-7xl px-4 py-8 lg:px-6">
          {renderList()}
        </div>
      </div>

      <Dialog onOpenChange={setOpen} open={open}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>创建服务器</DialogTitle>
          </DialogHeader>
          <form
            className="space-y-4"
            id="create-server-form"
            onSubmit={(e) => {
              void onSubmit(e);
            }}
          >
            <div className="space-y-2">
              <Label htmlFor="servername">服务器名字</Label>
              <Input
                id="servername"
                placeholder="请输入服务器名称"
                {...register("servername")}
              />
              {errors.servername ? (
                <p className="text-destructive text-sm">
                  {errors.servername.message}
                </p>
              ) : null}
            </div>
            <div className="space-y-2">
              <Label htmlFor="token">Token</Label>
              <div className="flex gap-2">
                <Input
                  className="flex-1"
                  id="token"
                  placeholder="请输入服务器の秘密 Token"
                  title="用于识别和验证服务器身份的密钥,请妥善保管。"
                  {...register("token")}
                />
                <Button
                  onClick={() => {
                    setValue("token", crypto.randomUUID());
                  }}
                  type="button"
                  variant="secondary"
                >
                  随机生成
                </Button>
              </div>
              {errors.token ? (
                <p className="text-destructive text-sm">
                  {errors.token.message}
                </p>
              ) : null}
            </div>
          </form>
          <DialogFooter>
            <Button
              disabled={createServer.isPending}
              onClick={() => {
                setOpen(false);
              }}
              variant="outline"
            >
              取消
            </Button>
            <Button
              disabled={createServer.isPending}
              form="create-server-form"
              type="submit"
            >
              确认创建
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
