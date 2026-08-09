import { useEffect, useState } from "react";
import type { ComponentProps } from "react";

import { Input } from "@/components/ui/input";

/**
 * 受控数字输入：编辑时用本地字符串做草稿，允许临时清空/只输入负号等中间态，
 * 不会像直接绑定 Number(value) 那样一清空就被强制归零、光标错位。
 * 只有草稿能解析成合法数字时才回调 onChange；失焦时草稿若非法则还原成外部值。
 */
export const NumberInput = ({
  value,
  onChange,
  ...props
}: Omit<ComponentProps<typeof Input>, "onChange" | "type" | "value"> & {
  value: number;
  onChange: (value: number) => void;
}) => {
  const [draft, setDraft] = useState(String(value));

  useEffect(() => {
    setDraft(String(value));
  }, [value]);

  return (
    <Input
      {...props}
      onBlur={() => {
        if (Number.isNaN(Number(draft)) || draft.trim() === "") {
          setDraft(String(value));
        }
      }}
      onChange={(e) => {
        const raw = e.target.value;
        setDraft(raw);
        const n = Number(raw);
        if (raw.trim() !== "" && !Number.isNaN(n)) {
          onChange(n);
        }
      }}
      type="number"
      value={draft}
    />
  );
};
