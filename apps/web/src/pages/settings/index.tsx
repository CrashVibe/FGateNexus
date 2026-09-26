import { SettingsColumns } from "@/components/common/settings-columns";
import { PageContent } from "@/components/layout/page-content";
import { PageHeader } from "@/components/layout/page-header";
import { t } from "@/i18n";
import { AboutContent } from "@/pages/settings/about";
import { BackupContent } from "@/pages/settings/backup";
import { BrowserContent } from "@/pages/settings/browser";
import { SecurityContent } from "@/pages/settings/security";

export const SettingsPage = () => (
  <>
    <PageHeader
      description={t("安全、浏览器与备份")}
      title={t("设置")}
      width="settings"
    />
    <PageContent width="settings">
      <SettingsColumns>
        <SecurityContent />
        <BrowserContent />
        <BackupContent />
        <AboutContent />
      </SettingsColumns>
    </PageContent>
  </>
);
