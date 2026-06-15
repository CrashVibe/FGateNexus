import { Link, useParams } from "@tanstack/react-router";
import { Pencil, Plus, Trash2 } from "lucide-react";

import type { TemplateInstance } from "#shared/model/template/schema/instance";
import { LoadingState } from "@/components/common/loading-state";
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

  const handleDelete = async (instance: TemplateInstance): Promise<void> => {
    try {
      await remove.mutateAsync(instance.id);
      toast.success("实例已删除");
    } catch (error) {
      toast.error("删除失败", { description: errorMessage(error) });
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
      <div className="scrollbar-custom flex-1 overflow-y-auto p-4 lg:p-6">
        {instances === undefined && <LoadingState />}
        {instances?.length === 0 && (
          <p className="text-muted-foreground py-12 text-center text-sm">
            该服务器还没有模板实例，点击右上角「新增实例」开始。
          </p>
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
                        void handleDelete(instance);
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
      </div>
    </>
  );
};
