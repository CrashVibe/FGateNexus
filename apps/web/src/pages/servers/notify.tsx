import { useParams } from "@tanstack/react-router";
import { useState } from "react";

import type { targetResponse } from "#shared/model/server/schema/target";
import {
  renderDeathMessage,
  renderJoinMessage,
  renderLeaveMessage,
} from "#shared/utils/template/notify";
import { LoadingState } from "@/components/common/loading-state";
import {
  SettingsBlock,
  SettingsSection,
} from "@/components/common/settings-section";
import { PageContent } from "@/components/layout/page-content";
import { ServerHeader } from "@/components/layout/server-header";
import { MessageTemplateField } from "@/components/target/message-template-field";
import { TargetConfigSheet } from "@/components/target/target-config-sheet";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useServerConfigForm } from "@/hooks/use-server-config-form";
import { NotifyData } from "@/lib/api";
import { DEATH_MSG_VAR, PLAYER_NAME_VAR } from "@/lib/template-variables";

export const ServerNotifyPage = () => {
  const { id } = useParams({ from: "/dashboard/servers/$id/notify" });
  const serverId = Number(id);

  const { config, setConfig, targets, setTargets, status } =
    useServerConfigForm(
      serverId,
      (s) => s.notifyConfig,
      async (notify, changedTargets) => {
        await NotifyData.patch(serverId, { notify, targets: changedTargets });
      },
    );
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const selectedTarget = targets.find((t) => t.id === selectedId) ?? null;

  const updateTargetNotify = (
    patch: Partial<targetResponse["config"]["NotifyConfigSchema"]>,
  ): void => {
    if (!selectedTarget) {
      return;
    }
    setTargets((prev) =>
      prev.map((t) =>
        t.id === selectedTarget.id
          ? {
              ...t,
              config: {
                ...t.config,
                NotifyConfigSchema: {
                  ...t.config.NotifyConfigSchema,
                  ...patch,
                },
              },
            }
          : t,
      ),
    );
  };

  return (
    <>
      <ServerHeader width="form" status={status} />
      <PageContent width="form">
        {config === null ? (
          <LoadingState />
        ) : (
          <div className="space-y-8">
            <SettingsSection
              description="玩家加入/离开服务器时发送通知"
              title="玩家进出事件"
            >
              <SettingsBlock>
                <MessageTemplateField
                  label="玩家进入时发送的消息"
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
                  label="玩家离开时发送的消息"
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

            <SettingsSection description="玩家死亡时发送通知" title="死亡事件">
              <SettingsBlock>
                <MessageTemplateField
                  label="玩家死亡时发送的消息"
                  onChange={(v) => {
                    setConfig({ ...config, death_notify_message: v });
                  }}
                  preview={renderDeathMessage(
                    config.death_notify_message,
                    "Steve",
                    "掉落",
                  )}
                  value={config.death_notify_message}
                  variables={[DEATH_MSG_VAR, PLAYER_NAME_VAR]}
                />
              </SettingsBlock>
            </SettingsSection>

            <SettingsSection
              description="针对不同目标单独配置通知开关"
              title="配置群聊"
            >
              <SettingsBlock>
                <TargetConfigSheet
                  onSelectedChange={setSelectedId}
                  selectedId={selectedId}
                  serverId={serverId}
                  targets={targets}
                >
                  {(target) => (
                    <div className="flex flex-col gap-4">
                      <div className="flex items-center justify-between">
                        <Label>玩家死亡通知</Label>
                        <Switch
                          checked={
                            target.config.NotifyConfigSchema
                              .player_disappoint_notify
                          }
                          onCheckedChange={(v) => {
                            updateTargetNotify({ player_disappoint_notify: v });
                          }}
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <Label>玩家进出通知</Label>
                        <Switch
                          checked={
                            target.config.NotifyConfigSchema.player_notify
                          }
                          onCheckedChange={(v) => {
                            updateTargetNotify({ player_notify: v });
                          }}
                        />
                      </div>
                    </div>
                  )}
                </TargetConfigSheet>
              </SettingsBlock>
            </SettingsSection>
          </div>
        )}
      </PageContent>
    </>
  );
};
