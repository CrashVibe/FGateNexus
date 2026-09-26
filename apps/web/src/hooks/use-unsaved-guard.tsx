import { useBlocker } from "@tanstack/react-router";
import type { ReactNode } from "react";

import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { t } from "@/i18n";

/** 有未保存的卡片时拦住路由跳转和关页；返回的弹窗需要渲染出来。 */
export const useUnsavedGuard = (dirty: boolean): ReactNode => {
  const blocker = useBlocker({
    disabled: !dirty,
    enableBeforeUnload: dirty,
    shouldBlockFn: () => true,
    withResolver: true,
  });
  return (
    <ConfirmDialog
      confirmText={t("不要了，走吧")}
      description={t("还有没保存的改动，离开就没了哦。")}
      onConfirm={() => blocker.proceed?.()}
      onOpenChange={(open) => {
        if (!open) {
          blocker.reset?.();
        }
      }}
      open={blocker.status === "blocked"}
      title={t("真的要走吗？")}
    />
  );
};
