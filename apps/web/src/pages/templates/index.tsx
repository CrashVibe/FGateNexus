import { Trash2, Upload } from "lucide-react";
import { useRef, useState } from "react";

import { TEMPLATE_DATA_SOURCE_LABELS } from "#shared/model/template/schema/manifest";
import type { TemplateManifest } from "#shared/model/template/schema/manifest";
import { LoadingState } from "@/components/common/loading-state";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "@/components/ui/sonner";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { errorMessage } from "@/lib/http";
import {
  useDeleteTemplate,
  useTemplates,
  useUploadTemplate,
} from "@/queries/templates";

const DataSourceBadges = ({
  sources,
}: {
  sources: TemplateManifest["dataSources"];
}) => {
  if (sources.length === 0) {
    return <span className="text-muted-foreground text-xs">无数据源</span>;
  }
  return sources.map((ds) => (
    <Badge key={ds.id} variant={ds.required ? "default" : "outline"}>
      {TEMPLATE_DATA_SOURCE_LABELS[ds.type]}
      {ds.required ? "" : "（可选）"}
    </Badge>
  ));
};

export const TemplatesPage = () => {
  const { data: templates } = useTemplates();
  const upload = useUploadTemplate();
  const remove = useDeleteTemplate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [pendingDelete, setPendingDelete] = useState<TemplateManifest | null>(
    null,
  );
  const [installedManifest, setInstalledManifest] =
    useState<TemplateManifest | null>(null);

  const handleFile = async (file: File): Promise<void> => {
    try {
      const manifest = await upload.mutateAsync(file);
      toast.success(`模板「${manifest.name}」已上传`);
      setInstalledManifest(manifest);
    } catch (error) {
      toast.error("上传失败", { description: errorMessage(error) });
    }
  };

  const handleDelete = async (): Promise<void> => {
    if (!pendingDelete) {
      return;
    }
    try {
      await remove.mutateAsync(pendingDelete.id);
      toast.success("模板已删除");
    } catch (error) {
      toast.error("删除失败", { description: errorMessage(error) });
    } finally {
      setPendingDelete(null);
    }
  };

  return (
    <>
      <PageHeader
        actions={
          <Button
            disabled={upload.isPending}
            onClick={() => fileInputRef.current?.click()}
            size="sm"
          >
            <Upload className="size-4" />
            上传模板
          </Button>
        }
        description="上传并管理图片模板包（.zip），随后在各服务器中配置实例。"
        title="图片模板"
      />
      <input
        accept=".zip,application/zip"
        aria-label="上传模板包"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) {
            void handleFile(file);
          }
          e.target.value = "";
        }}
        ref={fileInputRef}
        type="file"
      />
      <div className="scrollbar-custom flex-1 overflow-y-auto p-4 lg:p-6">
        {templates === undefined && <LoadingState />}
        {templates?.length === 0 && (
          <p className="text-muted-foreground py-12 text-center text-sm">
            还没有安装任何模板，点击右上角「上传模板」开始。
          </p>
        )}
        {templates !== undefined && templates.length > 0 && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {templates.map((tpl) => (
              <Card key={tpl.id}>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between gap-2">
                    <span className="truncate">{tpl.name}</span>
                    <Badge variant="secondary">v{tpl.version}</Badge>
                  </CardTitle>
                  <CardDescription className="truncate">
                    {tpl.description ?? `id: ${tpl.id}`}
                    {tpl.author ? ` · ${tpl.author}` : ""}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex flex-wrap gap-1.5">
                    <DataSourceBadges sources={tpl.dataSources} />
                  </div>
                  {tpl.networkPermissions.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {tpl.networkPermissions.map((perm) => (
                        <Tooltip key={perm.origin}>
                          <TooltipTrigger asChild>
                            <Badge variant="outline">
                              <span className="font-mono">{perm.origin}</span>
                            </Badge>
                          </TooltipTrigger>
                          <TooltipContent>{perm.reason}</TooltipContent>
                        </Tooltip>
                      ))}
                    </div>
                  )}
                  <Button
                    onClick={() => {
                      setPendingDelete(tpl);
                    }}
                    size="sm"
                    variant="ghost"
                  >
                    <Trash2 className="size-4" />
                    删除
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <Dialog
        onOpenChange={(open) => {
          if (!open) {
            setPendingDelete(null);
          }
        }}
        open={pendingDelete !== null}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>删除模板</DialogTitle>
            <DialogDescription>
              确定删除模板「{pendingDelete?.name}
              」吗？若仍有服务器实例引用该模板将无法删除。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">取消</Button>
            </DialogClose>
            <Button
              disabled={remove.isPending}
              onClick={() => {
                void handleDelete();
              }}
              variant="destructive"
            >
              删除
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        onOpenChange={(open) => {
          if (!open) {
            setInstalledManifest(null);
          }
        }}
        open={installedManifest !== null}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>模板「{installedManifest?.name}」已安装</DialogTitle>
            <DialogDescription>
              该模板声明的数据需求与第三方网络访问权限如下，未声明的网络请求将在渲染时被拦截。
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <p className="mb-1.5 text-sm font-medium">所需数据</p>
              <div className="flex flex-wrap gap-1.5">
                {installedManifest ? (
                  <DataSourceBadges sources={installedManifest.dataSources} />
                ) : null}
              </div>
            </div>
            <div>
              <p className="mb-1.5 text-sm font-medium">第三方网络权限</p>
              {installedManifest?.networkPermissions.length === 0 ? (
                <p className="text-muted-foreground text-xs">
                  未声明任何第三方网络访问，渲染时所有外部请求都将被拦截
                </p>
              ) : (
                <ul className="space-y-1 text-xs">
                  {installedManifest?.networkPermissions.map((perm) => (
                    <li key={perm.origin}>
                      <span className="font-mono">{perm.origin}</span>
                      <span className="text-muted-foreground">
                        {" "}
                        — {perm.reason}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button>知道了</Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
