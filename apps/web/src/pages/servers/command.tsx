import { useQuery } from "@tanstack/react-query";
import { useNavigate, useParams } from "@tanstack/react-router";
import { TriangleAlert } from "lucide-react";

import { CommandConfigSchema } from "#shared/model/server/schema/command";
import { LoadingState } from "@/components/common/loading-state";
import {
  SettingsRow,
  SettingsSection,
} from "@/components/common/settings-section";
import { PageContent } from "@/components/layout/page-content";
import { ServerHeader } from "@/components/layout/server-header";
import { TargetsHint } from "@/components/target/targets-hint";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { useServerForm } from "@/hooks/use-server-form";
import { t } from "@/i18n";
import { BrowserData, CommandData } from "@/lib/api";
import { useServer } from "@/queries/servers";

export const ServerCommandPage = () => {
  const { id } = useParams({ from: "/dashboard/servers/$id/command" });
  const serverId = Number(id);
  const navigate = useNavigate();

  const { data: server, refetch } = useServer(serverId);
  const { data: browser } = useQuery({
    queryFn: async () => await BrowserData.get(),
    queryKey: ["browser-config"],
  });

  const {
    form: config,
    guard,
    section,
    setForm: setConfig,
  } = useServerForm(
    server,
    (s) => structuredClone(s.commandConfig ?? CommandConfigSchema.parse({})),
    async (command) => {
      await CommandData.patch(serverId, { command });
      await refetch();
    },
  );

  return (
    <>
      {guard}
      <ServerHeader width="settings" />
      <PageContent width="settings">
        {config === null ? (
          <LoadingState />
        ) : (
          <div className="space-y-8">
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
          </div>
        )}
      </PageContent>
    </>
  );
};
