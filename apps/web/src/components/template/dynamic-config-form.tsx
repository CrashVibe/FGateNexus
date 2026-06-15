import { Plus, Trash2 } from "lucide-react";

import type {
  PlaceholderListEntry,
  TemplateConfigField,
} from "#shared/model/template/schema/manifest";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";

export type ConfigValue = Record<
  string,
  string | number | boolean | PlaceholderListEntry[]
>;

const PLACEHOLDERS_DEFAULT_MAX = 20;

interface PlaceholderListFieldProps {
  entries: PlaceholderListEntry[];
  max: number;
  onChange: (entries: PlaceholderListEntry[]) => void;
}

/** 占位符列表编辑器 */
const PlaceholderListField = ({
  entries,
  max,
  onChange,
}: PlaceholderListFieldProps) => {
  const update = (
    index: number,
    patch: Partial<PlaceholderListEntry>,
  ): void => {
    onChange(
      entries.map((entry, i) => (i === index ? { ...entry, ...patch } : entry)),
    );
  };
  const remove = (index: number): void => {
    onChange(entries.filter((_, i) => i !== index));
  };
  const add = (): void => {
    onChange([...entries, { label: "", placeholder: "" }]);
  };

  return (
    <div className="space-y-2">
      {entries.map((entry, i) => (
        <div className="flex gap-2" key={i}>
          <Input
            className="flex-1"
            onChange={(e) => {
              update(i, { label: e.target.value });
            }}
            placeholder="显示名称"
            value={entry.label}
          />
          <Input
            className="flex-1"
            onChange={(e) => {
              update(i, { placeholder: e.target.value });
            }}
            placeholder="占位符，如 vault_eco_balance"
            value={entry.placeholder}
          />
          <Button
            onClick={() => {
              remove(i);
            }}
            size="icon"
            type="button"
            variant="ghost"
          >
            <Trash2 className="size-4" />
          </Button>
        </div>
      ))}
      <Button
        disabled={entries.length >= max}
        onClick={add}
        size="sm"
        type="button"
        variant="outline"
      >
        <Plus className="size-4" />
        添加字段
      </Button>
    </div>
  );
};

interface DynamicConfigFormProps {
  fields: TemplateConfigField[];
  value: ConfigValue;
  onChange: (next: ConfigValue) => void;
}

export const DynamicConfigForm = ({
  fields,
  value,
  onChange,
}: DynamicConfigFormProps) => {
  if (fields.length === 0) {
    return (
      <p className="text-muted-foreground text-sm">该模板无可配置参数。</p>
    );
  }

  const set = (
    key: string,
    v: string | number | boolean | PlaceholderListEntry[],
  ): void => {
    onChange({ ...value, [key]: v });
  };

  return (
    <div className="flex flex-col gap-4">
      {fields.map((field) => {
        const current = value[field.key] ?? field.default;
        return (
          <div className="space-y-1.5" key={field.key}>
            <div className="flex items-center justify-between gap-2">
              <Label>{field.label}</Label>
              {field.type === "boolean" ? (
                <Switch
                  checked={current === true}
                  onCheckedChange={(v) => {
                    set(field.key, v);
                  }}
                />
              ) : null}
            </div>
            {field.description ? (
              <p className="text-muted-foreground text-xs">
                {field.description}
              </p>
            ) : null}

            {field.type === "number" ? (
              <Input
                onChange={(e) => {
                  set(field.key, Number(e.target.value));
                }}
                type="number"
                value={typeof current === "number" ? current : ""}
              />
            ) : null}

            {field.type === "select" ? (
              <Select
                onValueChange={(v) => {
                  set(field.key, v);
                }}
                value={typeof current === "string" ? current : undefined}
              >
                <SelectTrigger>
                  <SelectValue placeholder="请选择" />
                </SelectTrigger>
                <SelectContent>
                  {field.options.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : null}

            {field.type === "color" ? (
              <div className="flex items-center gap-2">
                <input
                  aria-label={field.label}
                  className="border-input h-9 w-12 cursor-pointer rounded-md border bg-transparent"
                  onChange={(e) => {
                    set(field.key, e.target.value);
                  }}
                  type="color"
                  value={typeof current === "string" ? current : "#000000"}
                />
                <Input
                  onChange={(e) => {
                    set(field.key, e.target.value);
                  }}
                  placeholder="#000000"
                  value={typeof current === "string" ? current : ""}
                />
              </div>
            ) : null}

            {field.type === "string" || field.type === "placeholder" ? (
              <Input
                onChange={(e) => {
                  set(field.key, e.target.value);
                }}
                placeholder={
                  field.type === "placeholder" ? "如 %player_name%" : undefined
                }
                value={typeof current === "string" ? current : ""}
              />
            ) : null}

            {field.type === "placeholders" ? (
              <PlaceholderListField
                entries={
                  Array.isArray(current) ? current : (field.default ?? [])
                }
                max={field.max ?? PLACEHOLDERS_DEFAULT_MAX}
                onChange={(entries) => {
                  set(field.key, entries);
                }}
              />
            ) : null}
          </div>
        );
      })}
    </div>
  );
};
