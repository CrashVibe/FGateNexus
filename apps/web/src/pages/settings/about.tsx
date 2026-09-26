import { ExternalLink } from "lucide-react";

import {
  SettingsRow,
  SettingsSection,
} from "@/components/common/settings-section";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { t } from "@/i18n";
import { useVersion } from "@/queries/settings";

export const AboutContent = () => {
  const { data } = useVersion();

  return (
    <SettingsSection title={t("关于")}>
      <SettingsRow
        badge={
          data ? (
            <Badge variant={data.hasUpdate ? "warning" : "success"}>
              {data.hasUpdate
                ? t("有新版本 v{{version}}", { version: data.latest?.version })
                : t("已是最新")}
            </Badge>
          ) : null
        }
        description={
          data
            ? t("当前 v{{current}}", { current: data.current })
            : t("查询中…")
        }
        label={t("版本")}
      >
        {data?.latest ? (
          <Button asChild size="sm" variant="outline">
            <a href={data.latest.url} rel="noreferrer" target="_blank">
              <ExternalLink />
              {data.hasUpdate ? t("去下载") : t("更新日志")}
            </a>
          </Button>
        ) : null}
      </SettingsRow>
    </SettingsSection>
  );
};
