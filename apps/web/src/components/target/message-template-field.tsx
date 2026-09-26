import type { ReactNode } from "react";

import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { t } from "@/i18n";

export interface TemplateVariable {
  value: string;
  label: string;
  example: string | number;
}

/** 消息模板输入 + 可点击插入的变量徽章 + 实时预览。 */
export const MessageTemplateField = ({
  label,
  value,
  onChange,
  variables,
  preview,
  multiline = false,
  maxLength,
  previewClassName = "text-success",
  previewNode,
  rows = 2,
}: {
  label: string;
  value: string;
  onChange: (next: string) => void;
  variables: TemplateVariable[];
  preview?: string;
  multiline?: boolean;
  maxLength?: number;
  previewClassName?: string;
  previewNode?: ReactNode;
  rows?: number;
}) => (
  <div className="space-y-2">
    <Label>{label}</Label>
    {multiline ? (
      <Textarea
        maxLength={maxLength}
        onChange={(e) => {
          onChange(e.target.value);
        }}
        rows={rows}
        value={value}
      />
    ) : (
      <Input
        maxLength={maxLength}
        onChange={(e) => {
          onChange(e.target.value);
        }}
        value={value}
      />
    )}
    <div className="flex flex-wrap items-center gap-1.5">
      <span
        className="text-muted-foreground mr-0.5 text-xs"
        title={t("点击变量插入到消息")}
      >
        {t("插入变量")}
      </span>
      {variables.map((tag) => (
        <button
          className="rounded-md focus-visible:outline-2 focus-visible:outline-offset-2 active:opacity-70"
          key={tag.value}
          onClick={() => {
            onChange(value + tag.value);
          }}
          title={`${tag.label} · [${tag.example}]`}
          type="button"
        >
          <Badge
            className="cursor-pointer font-mono"
            variant={value.includes(tag.value) ? "default" : "secondary"}
          >
            {tag.value}
          </Badge>
        </button>
      ))}
    </div>
    <div className="bg-muted/40 flex gap-2 rounded-md border border-dashed px-3 py-2 text-sm">
      <span className="text-muted-foreground shrink-0">{t("预览")}</span>
      <div className="min-w-0 break-words">
        {previewNode ?? <span className={previewClassName}>{preview}</span>}
      </div>
    </div>
  </div>
);
