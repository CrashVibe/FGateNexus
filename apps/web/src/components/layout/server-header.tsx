import { useLocation } from "@tanstack/react-router";
import type { ReactNode } from "react";

import { AutoSaveIndicator } from "@/components/common/auto-save-indicator";
import { useServerCrumbs } from "@/components/layout/breadcrumb";
import { useLayout } from "@/components/layout/context";
import type { PageWidth } from "@/components/layout/page-content";
import { PageHeader } from "@/components/layout/page-header";
import type { AutoSaveStatus } from "@/hooks/use-auto-save";
import { findMenuNode } from "@/lib/menu";

/** 服务器编辑页顶栏：根据当前路由从菜单推导标题/描述，并展示自动保存状态。 */
export const ServerHeader = ({
  actions,
  status,
  width,
}: {
  actions?: ReactNode;
  status?: AutoSaveStatus;
  width?: PageWidth;
}) => {
  const { menu } = useLayout();
  const { pathname } = useLocation();
  const node = findMenuNode(menu, pathname);
  const serverCrumbs = useServerCrumbs();

  return (
    <PageHeader
      // status 常驻挂载，淡入淡出由 AutoSaveIndicator 自己控制。
      actions={
        <>
          {status === undefined ? null : <AutoSaveIndicator status={status} />}
          {actions}
        </>
      }
      breadcrumb={[
        ...serverCrumbs,
        { content: node?.label ?? "服务器配置", key: "page" },
      ]}
      width={width}
    />
  );
};
