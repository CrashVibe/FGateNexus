import { useEffect, useRef, useState } from "react";

import { toast } from "@/components/ui/sonner";
import { errorMessage } from "@/lib/http";

export type AutoSaveStatus = "idle" | "pending" | "saving" | "saved" | "error";

const DEBOUNCE_MS = 900;
const SAVED_RESET_MS = 2000;

/**
 * deps 变化时防抖自动保存：停止编辑 900ms 后调用 save()。
 * save() 应该让错误原样抛出——由这里统一 toast，不要在调用方 catch。
 */
export const useAutoSaveTrigger = (
  deps: React.DependencyList,
  isDirty: boolean,
  save: () => Promise<void>,
): AutoSaveStatus => {
  const [status, setStatus] = useState<AutoSaveStatus>("idle");
  const saveRef = useRef(save);
  saveRef.current = save;
  const isDirtyRef = useRef(isDirty);
  isDirtyRef.current = isDirty;

  useEffect(() => {
    if (!isDirty) {
      return;
    }
    setStatus("pending");
    const timer = setTimeout(() => {
      void (async () => {
        if (!isDirtyRef.current) {
          return;
        }
        setStatus("saving");
        try {
          await saveRef.current();
          setStatus("saved");
        } catch (error) {
          setStatus("error");
          toast.error("自动保存失败", { description: errorMessage(error) });
        }
      })();
    }, DEBOUNCE_MS);
    return () => {
      clearTimeout(timer);
    };
    // deps 由调用方传入，用于在编辑时重置防抖计时器
    // oxlint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, isDirty]);

  useEffect(() => {
    if (status !== "saved") {
      return;
    }
    const timer = setTimeout(() => {
      setStatus("idle");
    }, SAVED_RESET_MS);
    return () => {
      clearTimeout(timer);
    };
  }, [status]);

  return status;
};
