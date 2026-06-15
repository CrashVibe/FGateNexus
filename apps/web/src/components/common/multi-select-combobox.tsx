import { Check, ChevronsUpDown, Plus, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export interface MultiSelectOption {
  label: string;
  value: string;
}

interface MultiSelectComboboxProps {
  options: MultiSelectOption[];
  value: string[];
  onChange: (value: string[]) => void;
  placeholder?: string;
  emptyText?: string;
  /** 允许自定义值 */
  creatable?: boolean;
}

export const MultiSelectCombobox = ({
  options,
  value,
  onChange,
  placeholder = "请选择",
  emptyText = "无匹配项",
  creatable = false,
}: MultiSelectComboboxProps) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [dropUp, setDropUp] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // 用于判断是否需向上展开
  const ESTIMATED_PANEL_HEIGHT = 280;

  useEffect(() => {
    if (!open) {
      return () => {
        // 未打开无需清理
      };
    }

    const trigger = containerRef.current;
    if (trigger) {
      const triggerRect = trigger.getBoundingClientRect();
      const dialog = trigger.closest('[role="dialog"]');
      const boundary = dialog
        ? dialog.getBoundingClientRect()
        : { bottom: window.innerHeight, top: 0 };
      const spaceBelow = boundary.bottom - triggerRect.bottom;
      const spaceAbove = triggerRect.top - boundary.top;
      setDropUp(spaceBelow < ESTIMATED_PANEL_HEIGHT && spaceAbove > spaceBelow);
    }

    const handlePointerDown = (e: MouseEvent): void => {
      if (!containerRef.current?.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent): void => {
      if (e.key === "Escape") {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  const labelOf = (v: string): string =>
    options.find((o) => o.value === v)?.label ?? v;

  const toggle = (v: string): void => {
    onChange(
      value.includes(v) ? value.filter((item) => item !== v) : [...value, v],
    );
    setSearch("");
  };

  const remove = (v: string): void => {
    onChange(value.filter((item) => item !== v));
  };

  const trimmedSearch = search.trim();
  const filteredOptions = options.filter((option) =>
    option.label.toLowerCase().includes(trimmedSearch.toLowerCase()),
  );
  const canCreate =
    creatable &&
    trimmedSearch.length > 0 &&
    !options.some((o) => o.value === trimmedSearch) &&
    !value.includes(trimmedSearch);

  return (
    <div className="space-y-1.5">
      <div className="relative" ref={containerRef}>
        <Button
          aria-expanded={open}
          aria-haspopup="listbox"
          className="w-full justify-between font-normal"
          onClick={() => {
            setOpen((o) => !o);
          }}
          type="button"
          variant="outline"
        >
          {value.length > 0 ? `已选择 ${value.length} 项` : placeholder}
          <ChevronsUpDown className="size-4 shrink-0 opacity-50" />
        </Button>
        {open ? (
          <div
            className={cn(
              "bg-popover text-popover-foreground absolute left-0 z-50 w-full rounded-md border p-2 shadow-md",
              dropUp ? "bottom-full mb-1" : "top-full mt-1",
            )}
          >
            <Input
              autoFocus
              className="mb-2"
              onChange={(e) => {
                setSearch(e.target.value);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" && canCreate) {
                  e.preventDefault();
                  toggle(trimmedSearch);
                }
              }}
              placeholder="搜索..."
              value={search}
            />
            <div className="max-h-60 space-y-0.5 overflow-y-auto">
              {filteredOptions.length === 0 && !canCreate ? (
                <p className="text-muted-foreground py-6 text-center text-sm">
                  {emptyText}
                </p>
              ) : null}
              {filteredOptions.map((option) => (
                <button
                  className="hover:bg-accent hover:text-accent-foreground flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm"
                  key={option.value}
                  onClick={() => {
                    toggle(option.value);
                  }}
                  type="button"
                >
                  <Check
                    className={cn(
                      "size-4 shrink-0",
                      value.includes(option.value)
                        ? "opacity-100"
                        : "opacity-0",
                    )}
                  />
                  {option.label}
                </button>
              ))}
              {canCreate ? (
                <button
                  className="hover:bg-accent hover:text-accent-foreground flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm"
                  onClick={() => {
                    toggle(trimmedSearch);
                  }}
                  type="button"
                >
                  <Plus className="size-4 shrink-0" />
                  添加“{trimmedSearch}”
                </button>
              ) : null}
            </div>
          </div>
        ) : null}
      </div>
      {value.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {value.map((v) => (
            <Badge className="gap-1" key={v} variant="secondary">
              {labelOf(v)}
              <button
                aria-label={`移除 ${labelOf(v)}`}
                className="hover:text-foreground -mr-0.5 rounded-full"
                onClick={() => {
                  remove(v);
                }}
                type="button"
              >
                <X className="size-3" />
              </button>
            </Badge>
          ))}
        </div>
      ) : null}
    </div>
  );
};
