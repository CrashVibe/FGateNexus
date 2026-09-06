import { PageContent } from "@/components/layout/page-content";
import { PageHeader } from "@/components/layout/page-header";
import { BrowserContent } from "@/pages/settings/browser";
import { SecurityContent } from "@/pages/settings/security";

export const SettingsPage = () => (
  <>
    <PageHeader description="安全设置与浏览器配置" title="设置" width="form" />
    <PageContent className="space-y-8" width="form">
      <SecurityContent />
      <BrowserContent />
    </PageContent>
  </>
);
