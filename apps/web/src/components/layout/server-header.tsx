import { useLocation } from "@tanstack/react-router";
import type { ReactNode } from "react";

import { AutoSaveIndicator } from "@/components/common/auto-save-indicator";
import { useLayout } from "@/components/layout/context";
import { PageHeader } from "@/components/layout/page-header";
import type { AutoSaveStatus } from "@/hooks/use-auto-save";
import { findMenuNode } from "@/lib/menu";

/** 服务器编辑页顶栏：根据当前路由从菜单推导标题/描述，并展示自动保存状态。 */
export const ServerHeader = ({
  actions,
  status,
}: {
  actions?: ReactNode;
  status?: AutoSaveStatus;
}) => {
  const { menu } = useLayout();
  const { pathname } = useLocation();
  const node = findMenuNode(menu, pathname);

  return (
    <PageHeader
      // status 常驻挂载，由 AutoSaveIndicator 自己控制淡入淡出；
      // 换成三元切换会导致它在 idle 时被卸载，动画根本来不及播放。
      actions={
        status === undefined ? actions : <AutoSaveIndicator status={status} />
      }
      description={node?.desc}
      title={node?.label ?? "服务器配置"}
    />
  );
};
