import { useLocation } from "@tanstack/react-router";
import type { ReactNode } from "react";

import { useServerCrumbs } from "@/components/layout/breadcrumb";
import { useLayout } from "@/components/layout/context";
import type { PageWidth } from "@/components/layout/page-content";
import { PageHeader } from "@/components/layout/page-header";
import { t } from "@/i18n";
import { findMenuNode } from "@/lib/menu";

/** 服务器编辑页顶栏：根据当前路由从菜单推导标题/描述。 */
export const ServerHeader = ({
  actions,
  width,
}: {
  actions?: ReactNode;
  width?: PageWidth;
}) => {
  const { menu } = useLayout();
  const { pathname } = useLocation();
  const node = findMenuNode(menu, pathname);
  const serverCrumbs = useServerCrumbs();

  return (
    <PageHeader
      actions={actions}
      breadcrumb={[
        ...serverCrumbs,
        { content: node?.label ?? t("服务器配置"), key: "page" },
      ]}
      width={width}
    />
  );
};
