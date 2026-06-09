import type { ReactNode } from "react";

import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

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
  previewClassName = "text-green-500",
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
    <p className="text-muted-foreground text-xs">点击变量插入到消息</p>
    <div className="flex flex-wrap gap-1">
      {variables.map((tag) => (
        <button
          key={tag.value}
          onClick={() => {
            onChange(value + tag.value);
          }}
          title={`${tag.label} · [${tag.example}]`}
          type="button"
        >
          <Badge
            className="cursor-pointer"
            variant={value.includes(tag.value) ? "default" : "secondary"}
          >
            {tag.value}
          </Badge>
        </button>
      ))}
    </div>
    <div className="text-muted-foreground text-sm">
      预览：
      {previewNode ?? <span className={previewClassName}>{preview}</span>}
    </div>
  </div>
);
