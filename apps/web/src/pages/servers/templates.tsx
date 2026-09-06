import { Link, useParams } from "@tanstack/react-router";
import { Image, Pencil, Plus, Trash2 } from "lucide-react";
import { useState } from "react";

import type { TemplateInstance } from "#shared/model/template/schema/instance";
import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { EmptyState } from "@/components/common/empty-state";
import { LoadingState } from "@/components/common/loading-state";
import { PageContent } from "@/components/layout/page-content";
import { ServerHeader } from "@/components/layout/server-header";
import { TemplatePreview } from "@/components/template/template-preview";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { toast } from "@/components/ui/sonner";
import { Switch } from "@/components/ui/switch";
import { errorMessage } from "@/lib/http";
import {
  useDeleteInstance,
  useTemplateInstances,
  useTemplates,
  useUpdateInstance,
} from "@/queries/templates";

export const ServerTemplatesPage = () => {
  const { id } = useParams({ from: "/dashboard/servers/$id/templates" });
  const serverId = Number(id);

  const { data: instances } = useTemplateInstances(serverId);
  const { data: templates } = useTemplates();
  const update = useUpdateInstance(serverId);
  const remove = useDeleteInstance(serverId);

  const templateName = (templateId: string): string =>
    templates?.find((t) => t.id === templateId)?.name ?? templateId;

  const handleToggle = async (
    instance: TemplateInstance,
    enabled: boolean,
  ): Promise<void> => {
    try {
      const result = await update.mutateAsync({
        body: { enabled },
        instanceId: instance.id,
      });
      if (result.warning) {
        toast.warning(result.warning);
      }
    } catch (error) {
      toast.error("切换状态失败", { description: errorMessage(error) });
    }
  };

  const [pendingDelete, setPendingDelete] = useState<TemplateInstance | null>(
    null,
  );

  const handleDelete = async (): Promise<void> => {
    if (!pendingDelete) {
      return;
    }
    try {
      await remove.mutateAsync(pendingDelete.id);
      toast.success("实例已删除");
    } catch (error) {
      toast.error("删除失败", { description: errorMessage(error) });
      throw error;
    }
  };

  return (
    <>
      <ServerHeader
        actions={
          <Button asChild size="sm">
            <Link
              params={{ id, instanceId: "new" }}
              to="/servers/$id/templates/$instanceId"
            >
              <Plus className="size-4" />
              新增实例
            </Link>
          </Button>
        }
      />
      <PageContent>
        {instances === undefined && <LoadingState />}
        {instances?.length === 0 && (
          <EmptyState
            action={
              <Button asChild>
                <Link
                  params={{ id, instanceId: "new" }}
                  to="/servers/$id/templates/$instanceId"
                >
                  <Plus className="size-4" />
                  新增实例
                </Link>
              </Button>
            }
            className="py-16"
            desc="该服务器还没有模板实例，创建一个来把渲染结果发到聊天平台"
            icon={<Image className="text-muted-foreground size-12" />}
            title="尚无模板实例"
          />
        )}
        {instances !== undefined && instances.length > 0 && (
          <div className="grid gap-4 lg:grid-cols-2">
            {instances.map((instance) => (
              <Card key={instance.id}>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between gap-2">
                    <span className="truncate">
                      {instance.name || templateName(instance.templateId)}
                    </span>
                    <Switch
                      checked={instance.enabled}
                      onCheckedChange={(v) => {
                        void handleToggle(instance, v);
                      }}
                    />
                  </CardTitle>
                  <CardDescription>
                    模板：{templateName(instance.templateId)}
                    {instance.binding
                      ? ` · 指令：${instance.binding.commands.join("、")}`
                      : ""}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex flex-wrap gap-2">
                    <Badge variant={instance.enabled ? "default" : "secondary"}>
                      {instance.enabled ? "已启用" : "未启用"}
                    </Badge>
                    {instance.binding ? (
                      <Badge variant="outline">
                        {instance.binding.permissions.length > 0
                          ? `权限：${instance.binding.permissions.join(", ")}`
                          : "所有人可用"}
                      </Badge>
                    ) : null}
                  </div>
                  <TemplatePreview
                    instanceId={instance.id}
                    serverId={serverId}
                  />
                  <div className="flex gap-2">
                    <Button asChild size="sm" variant="outline">
                      <Link
                        params={{ id, instanceId: instance.id }}
                        to="/servers/$id/templates/$instanceId"
                      >
                        <Pencil className="size-4" />
                        编辑
                      </Link>
                    </Button>
                    <Button
                      onClick={() => {
                        setPendingDelete(instance);
                      }}
                      size="sm"
                      variant="ghost"
                    >
                      <Trash2 className="size-4" />
                      删除
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </PageContent>

      <ConfirmDialog
        description={`确定删除实例「${pendingDelete?.name || ""}」吗？此操作不可恢复。`}
        onConfirm={handleDelete}
        onOpenChange={(open) => {
          if (!open) {
            setPendingDelete(null);
          }
        }}
        open={pendingDelete !== null}
        title="删除模板实例"
      />
    </>
  );
};
