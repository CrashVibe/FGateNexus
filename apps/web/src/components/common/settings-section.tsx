import type { ReactNode } from "react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/sonner";
import { t } from "@/i18n";
import { errorMessage } from "@/lib/http";
import { cn } from "@/lib/utils";

export interface SectionSave {
  dirty: boolean;
  onSave: () => Promise<void>;
}

const SaveFooter = ({ dirty, onSave }: SectionSave) => {
  const [saving, setSaving] = useState(false);
  const save = async (): Promise<void> => {
    setSaving(true);
    try {
      await onSave();
      toast.success(t("保存好啦～"));
    } catch (error) {
      toast.error(t("保存失败"), { description: errorMessage(error) });
    } finally {
      setSaving(false);
    }
  };
  return (
    <div className="bg-muted/40 flex min-h-12 items-center justify-between gap-4 border-t px-4 py-2">
      <p className="text-muted-foreground text-xs">
        {dirty ? t("有改动还没保存哦") : null}
      </p>
      <Button
        disabled={!dirty}
        loading={saving}
        onClick={() => {
          void save();
        }}
        size="sm"
        // 没改动时退成描边，一页七张卡不至于七个实心按钮
        variant={dirty ? "default" : "outline"}
      >
        {t("保存")}
      </Button>
    </div>
  );
};

interface SettingsSectionProps {
  title: ReactNode;
  description?: string;
  danger?: boolean;
  /** 给了就在卡片底部渲染保存条 */
  save?: SectionSave;
  /** 标题行右侧（如模式切换） */
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
}

/**
 * 设置分区：标题在卡片外，内容成卡，行与行之间发丝线分隔。
 */
export const SettingsSection = ({
  title,
  description,
  danger = false,
  save,
  actions,
  children,
  className,
}: SettingsSectionProps) => (
  <section className={cn("space-y-3", className)}>
    <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-2">
      <div className="min-w-0">
        <h2
          className={cn(
            "text-sm font-semibold tracking-tight",
            danger && "text-destructive",
          )}
        >
          {title}
        </h2>
        {description ? (
          <p className="text-muted-foreground mt-1 text-xs">{description}</p>
        ) : null}
      </div>
      {actions}
    </div>
    <div
      className={cn(
        "bg-card overflow-hidden rounded-xl border",
        danger && "border-destructive/30",
      )}
    >
      <div
        className={cn(
          "divide-border divide-y px-4",
          danger && "divide-destructive/20",
        )}
      >
        {children}
      </div>
      {save ? <SaveFooter {...save} /> : null}
    </div>
  </section>
);

interface SettingsRowProps {
  label: string;
  badge?: ReactNode;
  description?: string;
  children?: ReactNode;
  className?: string;
}

export const SettingsRow = ({
  label,
  badge,
  description,
  children,
  className,
}: SettingsRowProps) => (
  <div
    className={cn(
      // 窄屏：开关等小控件仍并排，w-full 的输入框自然换到下一行
      "flex flex-wrap items-center justify-between gap-x-8 gap-y-3 py-4",
      className,
    )}
  >
    <div className="min-w-0 flex-1 basis-56">
      <div className="flex min-h-5 items-center gap-2">
        <p className="text-sm font-medium">{label}</p>
        {badge}
      </div>
      {description ? (
        <p className="text-muted-foreground mt-0.5 text-xs leading-relaxed">
          {description}
        </p>
      ) : null}
    </div>
    {children ? (
      <div className="flex max-w-full shrink-0 justify-end max-sm:has-[>.w-full]:w-full">
        {children}
      </div>
    ) : null}
  </div>
);

// 全宽行：控件占满行宽（用于消息模板字段等复杂控件）。
export const SettingsBlock = ({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) => <div className={cn("py-4", className)}>{children}</div>;
