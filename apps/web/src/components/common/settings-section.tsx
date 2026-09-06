import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

interface SettingsSectionProps {
  title: ReactNode;
  description?: string;
  danger?: boolean;
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
  children,
  className,
}: SettingsSectionProps) => (
  <section className={cn("space-y-3", className)}>
    <div>
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
    <div
      className={cn(
        "bg-card divide-border divide-y rounded-xl border px-4",
        danger && "border-destructive/30 divide-destructive/20",
      )}
    >
      {children}
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
  <div className={cn("flex items-start justify-between gap-6 py-4", className)}>
    <div className="min-w-0 flex-1 pt-0.5">
      <div className="flex items-center gap-2">
        <p className="text-sm leading-none font-medium">{label}</p>
        {badge}
      </div>
      {description ? (
        <p className="text-muted-foreground mt-1 text-xs">{description}</p>
      ) : null}
    </div>
    {children ? <div className="shrink-0">{children}</div> : null}
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
