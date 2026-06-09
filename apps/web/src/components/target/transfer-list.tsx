import {
  ArrowLeftRight,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  ChevronsRight,
  Inbox,
  List,
  WifiOff,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export interface TransferItem {
  value: string;
  label: string;
  description?: string;
  avatar?: string;
}

const Listbox = ({
  items,
  picked,
  onPicked,
  loading,
  emptyIcon,
  emptyText,
}: {
  items: TransferItem[];
  picked: string[];
  onPicked: (next: string[]) => void;
  loading: boolean;
  emptyIcon: React.ReactNode;
  emptyText: string;
}) => {
  const [query, setQuery] = useState("");
  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    return items.filter(
      (i) =>
        i.label.toLowerCase().includes(q) ||
        (i.description ?? "").toLowerCase().includes(q),
    );
  }, [items, query]);

  const toggle = (value: string): void => {
    onPicked(
      picked.includes(value)
        ? picked.filter((v) => v !== value)
        : [...picked, value],
    );
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="p-2">
        <Input
          onChange={(e) => {
            setQuery(e.target.value);
          }}
          placeholder="搜索..."
          value={query}
        />
      </div>
      <div className="scrollbar-custom min-h-0 flex-1 overflow-y-auto px-1 pb-1">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-10 text-center">
            {loading ? null : emptyIcon}
            <span className="text-muted-foreground text-sm">
              {loading ? "加载中..." : emptyText}
            </span>
          </div>
        ) : (
          filtered.map((item) => (
            <button
              className={cn(
                "hover:bg-accent flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left transition-colors",
                picked.includes(item.value) && "bg-accent",
              )}
              key={item.value}
              onClick={() => {
                toggle(item.value);
              }}
              type="button"
            >
              <Avatar className="size-7">
                {item.avatar ? <AvatarImage src={item.avatar} /> : null}
                <AvatarFallback>{item.label.slice(0, 1)}</AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium">{item.label}</div>
                {item.description ? (
                  <div className="text-muted-foreground truncate text-xs">
                    {item.description}
                  </div>
                ) : null}
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  );
};

/** 双列穿梭框。 */
export const TransferList = ({
  items,
  selected,
  onChange,
  loading,
  error,
  onReload,
}: {
  items: TransferItem[];
  selected: Set<string>;
  onChange: (next: Set<string>) => void;
  loading: boolean;
  error: string | null;
  onReload: () => void;
}) => {
  const [availablePicked, setAvailablePicked] = useState<string[]>([]);
  const [selectedPicked, setSelectedPicked] = useState<string[]>([]);

  const selectedItems = items.filter((i) => selected.has(i.value));
  const availableItems = items.filter((i) => !selected.has(i.value));

  // 用稳定的字符串键作依赖，并在无变化时返回同一引用，避免无限重渲染。
  const availableKey = availableItems.map((i) => i.value).join("|");
  const selectedKey = selectedItems.map((i) => i.value).join("|");

  useEffect(() => {
    const valid = new Set(availableKey ? availableKey.split("|") : []);
    setAvailablePicked((p) => {
      const next = p.filter((v) => valid.has(v));
      return next.length === p.length ? p : next;
    });
  }, [availableKey]);
  useEffect(() => {
    const valid = new Set(selectedKey ? selectedKey.split("|") : []);
    setSelectedPicked((p) => {
      const next = p.filter((v) => valid.has(v));
      return next.length === p.length ? p : next;
    });
  }, [selectedKey]);

  const addPicked = (): void => {
    const next = new Set(selected);
    for (const v of availablePicked) {
      next.add(v);
    }
    onChange(next);
    setAvailablePicked([]);
  };

  const removePicked = (): void => {
    const next = new Set(selected);
    for (const v of selectedPicked) {
      next.delete(v);
    }
    onChange(next);
    setSelectedPicked([]);
  };

  const addAll = (): void => {
    onChange(new Set(items.map((i) => i.value)));
    setAvailablePicked([]);
  };

  const clearAll = (): void => {
    onChange(new Set());
    setSelectedPicked([]);
  };

  return (
    <div className="grid gap-3 md:grid-cols-[1fr_48px_1fr]">
      <div className="flex h-[460px] flex-col overflow-hidden rounded-xl border">
        <div className="flex shrink-0 items-center gap-2 border-b px-3 py-2.5">
          <List className="text-muted-foreground size-4 shrink-0" />
          <span className="text-sm font-medium">可选频道</span>
          <Badge className="ml-auto" variant="secondary">
            {availableItems.length}
          </Badge>
        </div>
        {error ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 p-6 text-center">
            <WifiOff className="text-muted-foreground size-8" />
            <p className="text-muted-foreground text-sm">加载失败，请重试</p>
            <Button onClick={onReload} size="sm" variant="destructive">
              重试
            </Button>
          </div>
        ) : (
          <Listbox
            emptyIcon={<Inbox className="text-muted-foreground size-7" />}
            emptyText="暂无可选频道"
            items={availableItems}
            loading={loading}
            onPicked={setAvailablePicked}
            picked={availablePicked}
          />
        )}
      </div>

      <div className="flex flex-row items-center justify-center gap-1 md:flex-col md:pt-10">
        <Button
          disabled={availableItems.length === 0}
          onClick={addAll}
          size="icon"
          variant="ghost"
        >
          <ChevronsRight />
        </Button>
        <Button
          disabled={availablePicked.length === 0}
          onClick={addPicked}
          size="icon"
        >
          <ChevronRight />
        </Button>
        <Button
          disabled={selectedPicked.length === 0}
          onClick={removePicked}
          size="icon"
          variant="secondary"
        >
          <ChevronLeft />
        </Button>
      </div>

      <div className="flex h-[460px] flex-col overflow-hidden rounded-xl border">
        <div className="flex shrink-0 items-center gap-2 border-b px-3 py-2.5">
          <CheckCircle className="size-4 shrink-0 text-green-500" />
          <span className="text-sm font-medium">已选频道</span>
          {selectedItems.length > 0 ? (
            <>
              <Badge className="ml-auto" variant="success">
                {selectedItems.length}
              </Badge>
              <Button onClick={clearAll} size="sm" variant="ghost">
                清空
              </Button>
            </>
          ) : null}
        </div>
        <Listbox
          emptyIcon={
            <ArrowLeftRight className="text-muted-foreground size-7" />
          }
          emptyText="从左侧选择要转发的频道"
          items={selectedItems}
          loading={loading}
          onPicked={setSelectedPicked}
          picked={selectedPicked}
        />
      </div>
    </div>
  );
};
