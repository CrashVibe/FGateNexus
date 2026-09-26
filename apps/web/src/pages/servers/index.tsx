import { zodResolver } from "@hookform/resolvers/zod";
import { useNavigate } from "@tanstack/react-router";
import { Plus } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import type { z } from "zod";

import { ServersAPI } from "#shared/model/server/api";
import { EmptyState } from "@/components/common/empty-state";
import { LoadingState } from "@/components/common/loading-state";
import { PageContent } from "@/components/layout/page-content";
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
import { useEntityStatusStream } from "@/hooks/use-status-event-stream";
import { lang, t } from "@/i18n";
import { errorMessage } from "@/lib/http";
import { serversKey, useCreateServer, useServers } from "@/queries/servers";

type FormData = z.infer<typeof ServersAPI.POST.request>;

export const ServersPage = () => {
  const navigate = useNavigate();
  const { data: serverList, isLoading } = useServers();
  const createServer = useCreateServer();
  const [open, setOpen] = useState(false);

  useEntityStatusStream("server", serversKey);

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
      const { id } = await createServer.mutateAsync({ ...data, lang });
      toast.success(t("服务器创建成功～"));
      setOpen(false);
      // 直接去接入指引
      await navigate({
        params: { id: String(id) },
        to: "/servers/$id/general",
      });
    } catch (error) {
      toast.error(t("创建服务器失败"), { description: errorMessage(error) });
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
              {t("创建服务器")}
            </Button>
          }
          className="mt-10"
          desc={t("暂无服务器，请先创建一个服务器")}
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
            {t("创建服务器")}
          </Button>
        }
        description={t("管理你的服务器，点击卡片进入详细配置")}
        title={t("服务器列表")}
      />

      <PageContent>{renderList()}</PageContent>

      <Dialog onOpenChange={setOpen} open={open}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("创建服务器")}</DialogTitle>
          </DialogHeader>
          <form
            className="space-y-4"
            id="create-server-form"
            onSubmit={(e) => {
              void onSubmit(e);
            }}
          >
            <div className="space-y-2">
              <Label htmlFor="servername">{t("服务器名字")}</Label>
              <Input
                id="servername"
                placeholder={t("请输入服务器名称")}
                {...register("servername")}
              />
              {errors.servername ? (
                <p className="text-destructive text-sm">
                  {t(errors.servername.message ?? "")}
                </p>
              ) : null}
            </div>
            <div className="space-y-2">
              <Label htmlFor="token">Token</Label>
              <div className="flex gap-2">
                <Input
                  className="flex-1"
                  id="token"
                  placeholder={t("请输入服务器の秘密 Token")}
                  title={t("用于识别和验证服务器身份的密钥,请妥善保管。")}
                  {...register("token")}
                />
                <Button
                  onClick={() => {
                    setValue("token", crypto.randomUUID());
                  }}
                  type="button"
                  variant="secondary"
                >
                  {t("随机生成")}
                </Button>
              </div>
              {errors.token ? (
                <p className="text-destructive text-sm">
                  {t(errors.token.message ?? "")}
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
              {t("取消")}
            </Button>
            <Button
              form="create-server-form"
              loading={createServer.isPending}
              type="submit"
            >
              {t("确认创建")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
