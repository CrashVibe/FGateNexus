import { isEqual } from "lodash-es";
import { useEffect, useMemo, useRef, useState } from "react";
import type { Dispatch, SetStateAction } from "react";

import { toast } from "@/components/ui/sonner";
import { useRegisterPageState } from "@/hooks/use-page-state";
import { errorMessage } from "@/lib/http";

/**
 * 管理服务器配置页面的表单状态：初始化、脏状态检测、保存/取消。
 * 封装了所有子页面共用的 useState + useEffect + isDirty + useRegisterPageState 模式。
 * TForm 是表单值类型，TInput 是服务端数据类型（默认与 TForm 相同）。
 */
export const useServerForm = <TForm, TInput = TForm>(
  serverData: TInput | undefined,
  buildForm: (data: TInput) => TForm,
  onSubmit: (form: TForm) => Promise<void>,
  options?: { successMessage?: string },
): {
  form: TForm | null;
  setForm: Dispatch<SetStateAction<TForm | null>>;
  isDirty: boolean;
} => {
  const successMessage = options?.successMessage ?? "配置已保存";

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

  const handleSubmit = async (): Promise<void> => {
    if (form === null) {
      return;
    }
    try {
      await onSubmitRef.current(form);
      setOriginal(structuredClone(form));
      toast.success(successMessage);
    } catch (error) {
      toast.error("保存配置失败", { description: errorMessage(error) });
    }
  };

  useRegisterPageState(
    isDirty,
    async () => {
      await handleSubmit();
    },
    () => {
      setForm(original === null ? null : structuredClone(original));
    },
  );

  return { form, isDirty, setForm };
};
