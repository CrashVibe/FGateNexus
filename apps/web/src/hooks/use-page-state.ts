import { useEffect, useRef } from "react";

import { usePageStateStore } from "@/stores/page-state";

export const useRegisterPageState = (
  isDirty: boolean,
  save: () => Promise<void>,
  cancel?: () => void,
): void => {
  const setPageState = usePageStateStore((s) => s.setPageState);
  const clearPageState = usePageStateStore((s) => s.clearPageState);
  const setDirty = usePageStateStore((s) => s.setDirty);

  const isDirtyRef = useRef(isDirty);
  isDirtyRef.current = isDirty;
  const saveRef = useRef(save);
  saveRef.current = save;
  const cancelRef = useRef(cancel);
  cancelRef.current = cancel;

  useEffect(() => {
    setPageState({
      cancel: () => {
        cancelRef.current?.();
      },
      isDirty: () => isDirtyRef.current,
      save: async () => {
        await saveRef.current();
      },
    });
    return () => {
      clearPageState();
    };
  }, [setPageState, clearPageState]);

  useEffect(() => {
    setDirty(isDirty);
  }, [isDirty, setDirty]);
};
