import { Link, useNavigate, useParams } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { PlatformType } from "#shared/model/bot/types";
import type { TemplateManifest } from "#shared/model/template/schema/manifest";
import { EmptyState } from "@/components/common/empty-state";
import { LoadingState } from "@/components/common/loading-state";
import { MultiSelectCombobox } from "@/components/common/multi-select-combobox";
import { PageContent } from "@/components/layout/page-content";
import { PageHeader } from "@/components/layout/page-header";
import { DynamicConfigForm } from "@/components/template/dynamic-config-form";
import type { ConfigValue } from "@/components/template/dynamic-config-form";
import { TemplateLivePreview } from "@/components/template/template-live-preview";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "@/components/ui/sonner";
import { Switch } from "@/components/ui/switch";
import { t } from "@/i18n";
import { errorMessage } from "@/lib/http";
import { ONEBOT_ROLES } from "@/lib/permissions";
import { useBot } from "@/queries/bots";
import { useServer } from "@/queries/servers";
import {
  useCreateInstance,
  useTemplateInstances,
  useTemplates,
  useUpdateInstance,
} from "@/queries/templates";

interface FormState {
  templateId: string;
  config: ConfigValue;
  commands: string[];
  permissions: string[];
  enabled: boolean;
}

const emptyForm = (): FormState => ({
  commands: [],
  config: {},
  enabled: false,
  permissions: [],
  templateId: "",
});

interface TemplateSelectProps {
  value: string;
  options: { id: string; name: string }[];
  onValueChange: (value: string) => void;
}

const TemplateSelect = ({
  value,
  options,
  onValueChange,
}: TemplateSelectProps) => {
  if (options.length === 0) {
    return (
      <p className="text-muted-foreground text-sm">
        {t("所有模板均已添加到该服务器。")}
      </p>
    );
  }
  return (
    <Select onValueChange={onValueChange} value={value || undefined}>
      <SelectTrigger>
        <SelectValue placeholder={t("请选择模板")} />
      </SelectTrigger>
      <SelectContent>
        {options.map((tpl) => (
          <SelectItem key={tpl.id} value={tpl.id}>
            {tpl.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};

interface InstanceConfigPanelProps {
  manifest: TemplateManifest;
  form: FormState;
  setForm: (update: (f: FormState) => FormState) => void;
  roleOptions: { label: string; value: string }[];
  serverId: number;
}

const InstanceConfigPanel = ({
  manifest,
  form,
  setForm,
  roleOptions,
  serverId,
}: InstanceConfigPanelProps) => (
  <div className="grid gap-6 lg:grid-cols-2">
    <div className="space-y-4">
      <DynamicConfigForm
        fields={manifest.configSchema}
        onChange={(config) => {
          setForm((f) => ({ ...f, config }));
        }}
        value={form.config}
      />

      <div className="space-y-1.5">
        <Label>{t("触发指令（可空，支持多个）")}</Label>
        <MultiSelectCombobox
          creatable
          emptyText={t("输入指令后回车添加，如 rank")}
          onChange={(commands) => {
            setForm((f) => ({ ...f, commands }));
          }}
          options={[]}
          placeholder={t("输入指令（聊天中发送对应指令触发渲染）")}
          value={form.commands}
        />
      </div>

      <div className="space-y-1.5">
        <Label>{t("权限（可空表示所有人）")}</Label>
        <MultiSelectCombobox
          creatable
          onChange={(permissions) => {
            setForm((f) => ({ ...f, permissions }));
          }}
          options={roleOptions}
          placeholder={t("选择或输入权限")}
          value={form.permissions}
        />
      </div>

      <div className="flex items-center justify-between">
        <Label>{t("启用")}</Label>
        <Switch
          checked={form.enabled}
          onCheckedChange={(v) => {
            setForm((f) => ({ ...f, enabled: v }));
          }}
        />
      </div>
    </div>

    <TemplateLivePreview
      config={form.config}
      serverId={serverId}
      templateId={form.templateId}
    />
  </div>
);

export const ServerTemplateInstancePage = () => {
  const { id, instanceId } = useParams({
    from: "/dashboard/servers/$id/templates/$instanceId",
  });
  const serverId = Number(id);
  const isNew = instanceId === "new";
  const navigate = useNavigate();

  const { data: instances } = useTemplateInstances(serverId);
  const { data: templates } = useTemplates();
  const { data: server } = useServer(serverId);
  const { data: bot } = useBot(server?.botId ?? null);
  const create = useCreateInstance(serverId);
  const update = useUpdateInstance(serverId);

  const existing = useMemo(
    () => instances?.find((i) => i.id === instanceId),
    [instances, instanceId],
  );

  const [form, setForm] = useState<FormState>(emptyForm());
  const [initialized, setInitialized] = useState(isNew);
  const [templateDialogOpen, setTemplateDialogOpen] = useState(isNew);

  useEffect(() => {
    if (initialized || !existing) {
      return;
    }
    setForm({
      commands: existing.binding?.commands ?? [],
      config: existing.config,
      enabled: existing.enabled,
      permissions: existing.binding?.permissions ?? [],
      templateId: existing.templateId,
    });
    setInitialized(true);
  }, [existing, initialized]);

  const roleOptions =
    bot?.platform === PlatformType.Onebot ||
    bot?.platform === PlatformType.Milky
      ? ONEBOT_ROLES
      : [];

  const selectedManifest = useMemo(
    () => templates?.find((item) => item.id === form.templateId),
    [templates, form.templateId],
  );

  const templateLabel = useMemo(
    () => selectedManifest?.name ?? form.templateId,
    [selectedManifest, form.templateId],
  );

  // 每服务器每模板限一实例
  const availableTemplates = useMemo(() => {
    const usedTemplateIds = new Set((instances ?? []).map((i) => i.templateId));
    return (templates ?? []).filter((item) => !usedTemplateIds.has(item.id));
  }, [templates, instances]);

  const buildBinding = () =>
    form.commands.length === 0
      ? null
      : { commands: form.commands, permissions: form.permissions };

  const handleTemplateDialogChange = (open: boolean): void => {
    if (open) {
      return;
    }
    if (form.templateId) {
      setTemplateDialogOpen(false);
      return;
    }
    void navigate({ params: { id }, to: "/servers/$id/templates" });
  };

  const handleSubmit = async (): Promise<void> => {
    try {
      if (existing) {
        const result = await update.mutateAsync({
          body: {
            binding: buildBinding(),
            config: form.config,
            enabled: form.enabled,
          },
          instanceId: existing.id,
        });
        toast.success(t("实例已更新"));
        if (result.warning) {
          toast.warning(result.warning);
        }
      } else {
        if (!form.templateId) {
          toast.error(t("请选择模板"));
          return;
        }
        await create.mutateAsync({
          binding: buildBinding(),
          config: form.config,
          enabled: form.enabled,
          templateId: form.templateId,
        });
        toast.success(t("实例已创建"));
      }
      await navigate({ params: { id }, to: "/servers/$id/templates" });
    } catch (error) {
      toast.error(t("保存失败"), { description: errorMessage(error) });
    }
  };

  const notReady =
    templates === undefined || (!isNew && instances === undefined);
  if (notReady) {
    return (
      <PageContent width="wide">
        <LoadingState />
      </PageContent>
    );
  }

  if (!isNew && !existing) {
    return (
      <PageContent width="wide">
        <EmptyState
          action={
            <Button asChild>
              <Link params={{ id }} to="/servers/$id/templates">
                <ArrowLeft />
                {t("返回实例列表")}
              </Link>
            </Button>
          }
          className="py-16"
          desc={t("该实例不存在或已被删除。")}
          title={t("未找到实例")}
        />
      </PageContent>
    );
  }

  return (
    <>
      <PageHeader
        width="wide"
        actions={
          <Button asChild size="sm" variant="outline">
            <Link params={{ id }} to="/servers/$id/templates">
              <ArrowLeft className="size-4" />
              {t("返回")}
            </Link>
          </Button>
        }
        title={isNew ? t("新增图片指令") : t("编辑图片指令")}
      />
      {isNew ? (
        <Dialog
          onOpenChange={handleTemplateDialogChange}
          open={templateDialogOpen}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t("选择模板")}</DialogTitle>
              <DialogDescription>
                {t("每个模板只能在同一服务器中添加一个实例。")}
              </DialogDescription>
            </DialogHeader>
            <TemplateSelect
              onValueChange={(v) => {
                setForm((f) => ({ ...f, config: {}, templateId: v }));
                setTemplateDialogOpen(false);
              }}
              options={availableTemplates}
              value={form.templateId}
            />
            <DialogFooter>
              <Button asChild variant="outline">
                <Link params={{ id }} to="/servers/$id/templates">
                  {t("取消")}
                </Link>
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      ) : null}
      <PageContent width="wide">
        <div className="space-y-6">
          <div className="max-w-sm space-y-1.5">
            <Label>{t("模板")}</Label>
            <p className="text-sm">{templateLabel}</p>
          </div>

          {selectedManifest ? (
            <InstanceConfigPanel
              form={form}
              manifest={selectedManifest}
              roleOptions={roleOptions}
              serverId={serverId}
              setForm={setForm}
            />
          ) : null}
        </div>
      </PageContent>

      <div className="border-border flex justify-end gap-2 border-t p-4">
        <Button asChild variant="outline">
          <Link params={{ id }} to="/servers/$id/templates">
            {t("取消")}
          </Link>
        </Button>
        <Button
          disabled={!selectedManifest}
          loading={create.isPending || update.isPending}
          onClick={() => {
            void handleSubmit();
          }}
        >
          {t("保存")}
        </Button>
      </div>
    </>
  );
};
