import { isEqual } from "lodash-es";
import { useEffect, useMemo, useRef, useState } from "react";
import type { Dispatch, SetStateAction } from "react";

import type { AutoSaveStatus } from "@/hooks/use-auto-save";
import { useAutoSaveTrigger } from "@/hooks/use-auto-save";

/**
 * 管理服务器配置页面的表单状态：初始化、脏状态检测、防抖自动保存。
 * 封装了所有子页面共用的 useState + useEffect + isDirty + 自动保存模式。
 * TForm 是表单值类型，TInput 是服务端数据类型（默认与 TForm 相同）。
 */
export const useServerForm = <TForm, TInput = TForm>(
  serverData: TInput | undefined,
  buildForm: (data: TInput) => TForm,
  onSubmit: (form: TForm) => Promise<void>,
): {
  form: TForm | null;
  setForm: Dispatch<SetStateAction<TForm | null>>;
  status: AutoSaveStatus;
} => {
  const [form, setForm] = useState<TForm | null>(null);
  const [original, setOriginal] = useState<TForm | null>(null);

  const buildFormRef = useRef(buildForm);
  buildFormRef.current = buildForm;
  const onSubmitRef = useRef(onSubmit);
  onSubmitRef.current = onSubmit;

  useEffect(() => {
    if (serverData !== undefined) {
      const next = buildFormRef.current(serverData);
      setForm(next);
      setOriginal(next);
    }
  }, [serverData]);

  const isDirty = useMemo(
    () => form !== null && original !== null && !isEqual(form, original),
    [form, original],
  );

  const status = useAutoSaveTrigger([form], isDirty, async () => {
    if (form === null) {
      return;
    }
    await onSubmitRef.current(form);
    setOriginal(structuredClone(form));
  });

  return { form, setForm, status };
};
