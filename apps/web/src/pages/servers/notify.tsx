import { useParams } from "@tanstack/react-router";

import {
  renderDeathMessage,
  renderJoinMessage,
  renderLeaveMessage,
} from "#shared/utils/template/notify";
import { LoadingState } from "@/components/common/loading-state";
import { SettingsColumns } from "@/components/common/settings-columns";
import {
  SettingsBlock,
  SettingsSection,
} from "@/components/common/settings-section";
import { PageContent } from "@/components/layout/page-content";
import { ServerHeader } from "@/components/layout/server-header";
import { MessageTemplateField } from "@/components/target/message-template-field";
import { TargetsHint } from "@/components/target/targets-hint";
import { useServerForm } from "@/hooks/use-server-form";
import { t } from "@/i18n";
import { NotifyData } from "@/lib/api";
import { DEATH_MSG_VAR, PLAYER_NAME_VAR } from "@/lib/template-variables";
import { useServer } from "@/queries/servers";

export const ServerNotifyPage = () => {
  const { id } = useParams({ from: "/dashboard/servers/$id/notify" });
  const serverId = Number(id);

  const { data: server, refetch } = useServer(serverId);
  const {
    form: config,
    guard,
    section,
    setForm: setConfig,
  } = useServerForm(
    server?.notifyConfig,
    (c) => structuredClone(c),
    async (notify) => {
      await NotifyData.patch(serverId, { notify });
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
          <SettingsColumns>
            <TargetsHint feature={t("收到事件通知")} serverId={serverId} />
            <SettingsSection
              description={t("玩家加入/离开服务器时发送通知")}
              save={section(["join_notify_message", "leave_notify_message"])}
              title={t("玩家进出事件")}
            >
              <SettingsBlock>
                <MessageTemplateField
                  label={t("玩家进入时发送的消息")}
                  onChange={(v) => {
                    setConfig({ ...config, join_notify_message: v });
                  }}
                  preview={renderJoinMessage(
                    config.join_notify_message,
                    "Steve",
                  )}
                  value={config.join_notify_message}
                  variables={[PLAYER_NAME_VAR]}
                />
              </SettingsBlock>
              <SettingsBlock>
                <MessageTemplateField
                  label={t("玩家离开时发送的消息")}
                  onChange={(v) => {
                    setConfig({ ...config, leave_notify_message: v });
                  }}
                  preview={renderLeaveMessage(
                    config.leave_notify_message,
                    "Steve",
                  )}
                  value={config.leave_notify_message}
                  variables={[PLAYER_NAME_VAR]}
                />
              </SettingsBlock>
            </SettingsSection>

            <SettingsSection
              description={t("玩家死亡时发送通知")}
              save={section(["death_notify_message"])}
              title={t("死亡事件")}
            >
              <SettingsBlock>
                <MessageTemplateField
                  label={t("玩家死亡时发送的消息")}
                  onChange={(v) => {
                    setConfig({ ...config, death_notify_message: v });
                  }}
                  preview={renderDeathMessage(
                    config.death_notify_message,
                    "Steve",
                    t("掉落"),
                  )}
                  value={config.death_notify_message}
                  variables={[DEATH_MSG_VAR, PLAYER_NAME_VAR]}
                />
              </SettingsBlock>
            </SettingsSection>
          </SettingsColumns>
        )}
      </PageContent>
    </>
  );
};
