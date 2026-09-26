import { useNavigate, useParams } from "@tanstack/react-router";
import { TriangleAlert } from "lucide-react";

import { CommandConfigSchema } from "#shared/model/server/schema/command";
import {
  SettingsRow,
  SettingsSection,
} from "@/components/common/settings-section";
import { ServerSettingsPage } from "@/components/layout/server-settings-page";
import { TargetsHint } from "@/components/target/targets-hint";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { useServerForm } from "@/hooks/use-server-form";
import { t } from "@/i18n";
import { CommandData } from "@/lib/api";
import { useServer } from "@/queries/servers";
import { useBrowserConfig } from "@/queries/settings";

export const ServerCommandPage = () => {
  const { id } = useParams({ from: "/dashboard/servers/$id/command" });
  const serverId = Number(id);
  const navigate = useNavigate();

  const { data: server } = useServer(serverId);
  const { data: browser } = useBrowserConfig();

  const {
    form: draft,
    guard,
    section,
    setForm: setConfig,
  } = useServerForm(
    server,
    (s) => structuredClone(s.commandConfig ?? CommandConfigSchema.parse({})),
    async (command) => {
      await CommandData.patch(serverId, { command });
    },
  );

  return (
    <ServerSettingsPage guard={guard} value={draft}>
      {(config) => (
        <>
          <TargetsHint feature={t("能执行远程指令")} serverId={serverId} />
          <SettingsSection
            save={section(["imageRender"])}
            title={t("基础设置")}
          >
            <SettingsRow
              description={t("将指令返回结果的颜色代码转换为图片后发送")}
              label={t("图片渲染")}
            >
              <Switch
                checked={config.imageRender}
                onCheckedChange={(v) => {
                  setConfig({ ...config, imageRender: v });
                }}
              />
            </SettingsRow>
            {browser?.executablePath === null ? (
              <div className="pb-4">
                <Alert variant="warning">
                  <TriangleAlert />
                  <AlertDescription>
                    <Button
                      className="h-auto p-0"
                      onClick={() => {
                        void navigate({ to: "/settings" });
                      }}
                      variant="link"
                    >
                      {t("图片渲染功能需要配置浏览器路径才能使用（去配置）")}
                    </Button>
                  </AlertDescription>
                </Alert>
              </div>
            ) : null}
          </SettingsSection>
        </>
      )}
    </ServerSettingsPage>
  );
};
