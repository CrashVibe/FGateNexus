import { Check, TriangleAlert } from "lucide-react";
import { useEffect, useState } from "react";

import type { AutoSaveStatus } from "@/hooks/use-auto-save";
import { cn } from "@/lib/utils";

type Content = Exclude<AutoSaveStatus, "idle">;

const SPINNER_BLADES = 8;

/** 8 根辐条依次淡出，形成旋转效果。 */
const AppleSpinner = () => (
  <span aria-hidden="true" className="apple-spinner">
    {Array.from({ length: SPINNER_BLADES }, (_, i) => (
      <span
        className="apple-spinner-blade"
        key={i}
        style={{
          animationDelay: `${(-(SPINNER_BLADES - i) / SPINNER_BLADES).toFixed(3)}s`,
          transform: `rotate(${(360 / SPINNER_BLADES) * i}deg)`,
        }}
      />
    ))}
  </span>
);

const CONFIG: Record<
  Content,
  { label: string; tone: string; icon: React.ReactNode }
> = {
  error: {
    icon: <TriangleAlert className="size-3.5" />,
    label: "保存失败",
    tone: "text-destructive",
  },
  pending: {
    icon: <span className="bg-muted-foreground size-1.5 rounded-full" />,
    label: "有改动待保存",
    tone: "text-muted-foreground",
  },
  saved: {
    icon: <Check className="size-3.5" />,
    label: "已自动保存",
    tone: "text-green-500",
  },
  saving: {
    icon: <AppleSpinner />,
    label: "保存中",
    tone: "text-muted-foreground",
  },
};

/** 自动保存状态指示。 */
export const AutoSaveIndicator = ({ status }: { status: AutoSaveStatus }) => {
  // content 只在非 idle 时更新，idle 时保留上一个状态的内容。
  const [content, setContent] = useState<Content>("saved");
  const visible = status !== "idle";

  useEffect(() => {
    if (status !== "idle") {
      setContent(status);
    }
  }, [status]);

  const { label, tone, icon } = CONFIG[content];

  return (
    <div
      aria-live="polite"
      className={cn(
        "flex items-center gap-1.5 text-xs font-medium",
        "transition-[opacity,transform] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]",
        visible
          ? "translate-y-0 opacity-100"
          : "pointer-events-none -translate-y-0.5 opacity-0",
        tone,
      )}
    >
      {/* key 变化 = 新 DOM 节点，触发一次性挂载动画，不会在容器淡出时重放 */}
      <span
        className="status-content-in flex items-center gap-1.5"
        key={content}
      >
        {icon}
        {label}
      </span>
    </div>
  );
};
