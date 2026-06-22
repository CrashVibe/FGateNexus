import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

import { Separator } from "@/components/ui/separator";
import { useDragResize } from "@/hooks/use-drag-resize";
import { cn } from "@/lib/utils";

interface SettingsSectionProps {
  title: ReactNode;
  description?: string;
  danger?: boolean;
  children: ReactNode;
  className?: string;
}

export const SettingsSection = ({
  title,
  description,
  danger = false,
  children,
  className,
}: SettingsSectionProps) => (
  <div
    className={cn(
      danger && "border-destructive/30 rounded-lg border p-4",
      className,
    )}
  >
    <div className="mb-1">
      <h2
        className={cn(
          "text-sm font-semibold tracking-tight",
          danger && "text-destructive",
        )}
      >
        {title}
      </h2>
      {description ? (
        <p className="text-muted-foreground mt-0.5 text-xs">{description}</p>
      ) : null}
    </div>
    <Separator className={cn(danger && "bg-destructive/20")} />
    <div>{children}</div>
  </div>
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

export interface SubNavItem {
  icon?: LucideIcon;
  label: string;
  description?: string;
  value: string;
}

interface SubNavProps {
  items: SubNavItem[];
  value: string;
  onChange: (value: string) => void;
  title?: string;
}

export const SubNav = ({ items, value, onChange, title }: SubNavProps) => (
  <div className="flex h-full flex-col">
    {title ? (
      <div className="flex h-12 shrink-0 items-center justify-between border-b px-4">
        <span className="text-sm font-semibold">{title}</span>
        <span className="text-muted-foreground text-xs">{items.length} 项</span>
      </div>
    ) : null}
    <nav className="flex flex-col gap-1 px-2 py-3">
      {items.map((item) => {
        const Icon = item.icon;
        const active = value === item.value;
        return (
          <button
            className={cn(
              "flex h-[46px] items-center gap-3 rounded px-3 text-left transition-colors",
              active
                ? "bg-accent text-foreground"
                : "text-muted-foreground hover:bg-muted",
            )}
            key={item.value}
            onClick={() => {
              onChange(item.value);
            }}
            type="button"
          >
            {Icon ? (
              <div
                className={cn(
                  "flex size-7 shrink-0 items-center justify-center rounded",
                  active
                    ? "bg-foreground/10 text-foreground"
                    : "bg-muted text-muted-foreground",
                )}
              >
                <Icon className="size-3.5" />
              </div>
            ) : null}
            <div className="min-w-0">
              <p
                className={cn(
                  "text-sm leading-none font-medium",
                  active && "text-foreground",
                )}
              >
                {item.label}
              </p>
              {item.description ? (
                <p className="text-muted-foreground mt-1 truncate text-xs">
                  {item.description}
                </p>
              ) : null}
            </div>
          </button>
        );
      })}
    </nav>
  </div>
);

/** 标准两栏子页面布局：左侧 SubNav + 右侧内容面板（含 h-12 标题栏）。 */
export const SubPageLayout = ({
  title,
  items,
  value,
  onChange,
  headerActions,
  children,
}: {
  title?: string;
  items: SubNavItem[];
  value: string;
  onChange: (value: string) => void;
  headerActions?: ReactNode;
  children: ReactNode;
}) => {
  const currentItem = items.find((i) => i.value === value);
  const [navWidth, startNavResize] = useDragResize(320, 180, 480);
  return (
    <div className="flex flex-1 overflow-hidden">
      <aside
        className="relative shrink-0 overflow-y-auto border-r"
        style={{ width: navWidth }}
      >
        <SubNav items={items} onChange={onChange} title={title} value={value} />
        <div
          className="group absolute inset-y-0 -right-1 z-10 w-2 cursor-col-resize"
          onMouseDown={startNavResize}
        >
          <div className="absolute top-1/2 left-1/2 h-10 w-[3px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-transparent transition-colors group-hover:bg-white/50" />
        </div>
      </aside>
      <div className="flex flex-1 flex-col overflow-hidden">
        <div className="flex h-12 shrink-0 items-center border-b px-6">
          <div className="flex min-w-0 flex-col justify-center">
            <span className="text-sm leading-none font-semibold">
              {currentItem?.label}
            </span>
            {currentItem?.description ? (
              <span className="text-muted-foreground mt-1 truncate text-xs leading-none">
                {currentItem.description}
              </span>
            ) : null}
          </div>
          {headerActions ? (
            <div className="ml-auto flex items-center gap-2">
              {headerActions}
            </div>
          ) : null}
        </div>
        <div className="scrollbar-custom flex-1 overflow-y-auto">
          <div className="px-6 py-8">{children}</div>
        </div>
      </div>
    </div>
  );
};
