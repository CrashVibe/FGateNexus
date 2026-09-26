import type { ReactNode } from "react";

import { LoadingState } from "@/components/common/loading-state";
import { SettingsColumns } from "@/components/common/settings-columns";
import { PageContent } from "@/components/layout/page-content";
import { ServerHeader } from "@/components/layout/server-header";

/** 服务器配置页骨架；value 为 null 时转圈 */
export const ServerSettingsPage = <T,>({
  guard,
  value,
  children,
}: {
  guard: ReactNode;
  value: T | null;
  children: (value: T) => ReactNode;
}) => (
  <>
    {guard}
    <ServerHeader width="settings" />
    <PageContent width="settings">
      {value === null ? (
        <LoadingState />
      ) : (
        <SettingsColumns>{children(value)}</SettingsColumns>
      )}
    </PageContent>
  </>
);
