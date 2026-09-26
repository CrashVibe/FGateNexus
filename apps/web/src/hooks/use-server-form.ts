import { isEqual, pick } from "lodash-es";
import { useEffect, useRef, useState } from "react";
import type { Dispatch, ReactNode, SetStateAction } from "react";

import type { SectionSave } from "@/components/common/settings-section";
import { useUnsavedGuard } from "@/hooks/use-unsaved-guard";

/** 按卡片保存：section(keys) 只提交这些字段；刷新时保留用户改过的字段 */
export const useServerForm = <TForm extends object, TInput = TForm>(
  serverData: TInput | undefined,
  buildForm: (data: TInput) => TForm,
  onSubmit: (form: TForm) => Promise<void>,
): {
  form: TForm | null;
  /** 离开页面确认弹窗，页面需渲染 */
  guard: ReactNode;
  section: (keys: (keyof TForm)[]) => SectionSave;
  setForm: Dispatch<SetStateAction<TForm | null>>;
} => {
  const [form, setForm] = useState<TForm | null>(null);
  const [saved, setSaved] = useState<TForm | null>(null);
  const savedRef = useRef<TForm | null>(null);

  const buildFormRef = useRef(buildForm);
  buildFormRef.current = buildForm;
  const onSubmitRef = useRef(onSubmit);
  onSubmitRef.current = onSubmit;

  useEffect(() => {
    if (serverData === undefined) {
      return;
    }
    const next = buildFormRef.current(serverData);
    const prevSaved = savedRef.current;
    savedRef.current = next;
    setSaved(next);
    setForm((prev) =>
      prev === null || prevSaved === null
        ? next
        : (Object.fromEntries(
            Object.keys(next).map((k) => {
              const key = k as keyof TForm;
              return [
                k,
                isEqual(prev[key], prevSaved[key]) ? next[key] : prev[key],
              ];
            }),
          ) as TForm),
    );
  }, [serverData]);

  const guard = useUnsavedGuard(
    form !== null && saved !== null && !isEqual(form, saved),
  );

  const section = (keys: (keyof TForm)[]): SectionSave => ({
    dirty:
      form !== null &&
      saved !== null &&
      keys.some((k) => !isEqual(form[k], saved[k])),
    onSave: async () => {
      const base = savedRef.current;
      if (form === null || base === null) {
        return;
      }
      const next = { ...base, ...pick(form, keys) } as TForm;
      await onSubmitRef.current(next);
      savedRef.current = next;
      setSaved(next);
    },
  });

  return { form, guard, section, setForm };
};
