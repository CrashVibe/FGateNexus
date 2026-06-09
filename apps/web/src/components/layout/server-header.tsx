import { useLocation } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { useState } from "react";

import { useLayout } from "@/components/layout/context";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { findMenuNode } from "@/lib/menu";
import { usePageStateStore } from "@/stores/page-state";

/** 服务器编辑页顶栏：根据当前路由从菜单推导标题/描述，并在脏状态时显示保存/取消按钮。 */
export const ServerHeader = ({ actions }: { actions?: ReactNode }) => {
  const { menu } = useLayout();
  const { pathname } = useLocation();
  const node = findMenuNode(menu, pathname);

  const dirty = usePageStateStore((s) => s.dirty);
  const savePage = usePageStateStore((s) => s.savePage);
  const cancelPage = usePageStateStore((s) => s.cancelPage);
  const [saving, setSaving] = useState(false);

  const dirtyActions = dirty ? (
    <div className="flex gap-2">
      <Button
        disabled={saving}
        onClick={cancelPage}
        size="sm"
        variant="secondary"
      >
        取消更改
      </Button>
      <Button
        disabled={saving}
        // oxlint-disable-next-line typescript/no-misused-promises
        onClick={async () => {
          setSaving(true);
          try {
            await savePage();
          } finally {
            setSaving(false);
          }
        }}
        size="sm"
      >
        保存配置
      </Button>
    </div>
  ) : (
    actions
  );

  return (
    <PageHeader
      actions={dirtyActions}
      description={node?.desc}
      title={node?.label ?? "服务器配置"}
    />
  );
};
