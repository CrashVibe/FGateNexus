import { useParams } from "@tanstack/react-router";
import { useState } from "react";
import type { z } from "zod";

import type { ChatSyncConfigSchema } from "#shared/model/server/schema/chat-sync";
import {
  formatMCToPlatformMessage,
  formatPlatformToMCMessage,
} from "#shared/utils/chat-sync";
import { LoadingState } from "@/components/common/loading-state";
import {
  SettingsBlock,
  SettingsRow,
  SettingsSection,
} from "@/components/common/settings-section";
import { PageContent } from "@/components/layout/page-content";
import { ServerHeader } from "@/components/layout/server-header";
import { MessageTemplateField } from "@/components/target/message-template-field";
import { TargetConfigSheet } from "@/components/target/target-config-sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NumberInput } from "@/components/ui/number-input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useServerConfigForm } from "@/hooks/use-server-config-form";
import { ChatSyncData } from "@/lib/api";
import {
  MC_TO_PLATFORM_VARS,
  PLATFORM_TO_MC_VARS,
} from "@/lib/template-variables";
import { useServer } from "@/queries/servers";

type ChatSyncConfig = z.infer<typeof ChatSyncConfigSchema>;
type ArrayFilterKey =
  | "blacklistKeywords"
  | "blacklistRegex"
  | "whitelistPrefixes"
  | "whitelistRegex";

const ArrayField = ({
  label,
  desc,
  value,
  onChange,
  multiline,
  placeholder,
}: {
  label: string;
  desc: string;
  value: string[];
  onChange: (next: string[]) => void;
  multiline?: boolean;
  placeholder: string;
}) => {
  const text = value.join(",");
  const update = (raw: string): void => {
    onChange(
      raw
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
    );
  };
  return (
    <SettingsBlock>
      <div className="space-y-1.5">
        <p className="text-sm font-medium">{label}</p>
        <p className="text-muted-foreground text-xs">{desc}</p>
        {multiline ? (
          <Textarea
            onChange={(e) => {
              update(e.target.value);
            }}
            placeholder={placeholder}
            rows={2}
            value={text}
          />
        ) : (
          <Input
            onChange={(e) => {
              update(e.target.value);
            }}
            placeholder={placeholder}
            value={text}
          />
        )}
      </div>
    </SettingsBlock>
  );
};

export const ServerMsgbridgePage = () => {
  const { id } = useParams({ from: "/dashboard/servers/$id/msgbridge" });
  const serverId = Number(id);

  const { data: server } = useServer(serverId);
  const { config, setConfig, targets, setTargets, status } =
    useServerConfigForm(
      serverId,
      (s) => s.chatSyncConfig,
      async (chatsync, changedTargets) => {
        await ChatSyncData.patch(serverId, {
          chatsync,
          targets: changedTargets,
        });
      },
    );
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const setFilter = (patch: Partial<ChatSyncConfig["filters"]>): void => {
    setConfig((prev) => ({ ...prev, filters: { ...prev.filters, ...patch } }));
  };
  const setArrayFilter = (key: ArrayFilterKey) => (next: string[]) => {
    setFilter({ [key]: next });
  };

  return (
    <>
      <ServerHeader status={status} width="form" />
      <PageContent className="space-y-8" width="form">
        {config === null ? (
          <LoadingState />
        ) : (
          <>
            <SettingsSection
              description="控制聊天同步功能的启用状态及消息方向"
              title="聊天同步"
            >
              <SettingsRow
                description="将 Minecraft 玩家消息转发到聊天平台"
                label="MC → 平台"
              >
                <Switch
                  checked={config.mcToPlatformEnabled}
                  onCheckedChange={(v) => {
                    setConfig({ ...config, mcToPlatformEnabled: v });
                  }}
                />
              </SettingsRow>
              <SettingsRow
                description="将聊天平台消息转发到 Minecraft 服务器"
                label="平台 → MC"
              >
                <Switch
                  checked={config.platformToMcEnabled}
                  onCheckedChange={(v) => {
                    setConfig({ ...config, platformToMcEnabled: v });
                  }}
                />
              </SettingsRow>
            </SettingsSection>

            <SettingsSection
              description="配置消息长度限制和内容过滤规则"
              title="消息过滤"
            >
              <SettingsRow
                description="低于此长度的消息将被忽略"
                label="最小长度"
              >
                <NumberInput
                  className="w-28 text-right"
                  onChange={(minMessageLength) => {
                    setFilter({ minMessageLength });
                  }}
                  value={config.filters.minMessageLength}
                />
              </SettingsRow>
              <SettingsRow
                description="超过此长度的消息将被截断或忽略"
                label="最大长度"
              >
                <NumberInput
                  className="w-28 text-right"
                  onChange={(maxMessageLength) => {
                    setFilter({ maxMessageLength });
                  }}
                  value={config.filters.maxMessageLength}
                />
              </SettingsRow>
              <SettingsRow label="过滤模式">
                <div className="flex gap-2">
                  <Button
                    onClick={() => {
                      setFilter({ filterMode: "blacklist" });
                    }}
                    size="sm"
                    variant={
                      config.filters.filterMode === "blacklist"
                        ? "default"
                        : "outline"
                    }
                  >
                    黑名单
                  </Button>
                  <Button
                    onClick={() => {
                      setFilter({ filterMode: "whitelist" });
                    }}
                    size="sm"
                    variant={
                      config.filters.filterMode === "whitelist"
                        ? "default"
                        : "outline"
                    }
                  >
                    白名单
                  </Button>
                </div>
              </SettingsRow>
              {config.filters.filterMode === "blacklist" ? (
                <>
                  <ArrayField
                    desc="包含这些关键词的消息将被过滤，不会转发"
                    label="屏蔽关键词"
                    onChange={setArrayFilter("blacklistKeywords")}
                    placeholder="用逗号分隔多个关键词，如：广告,刷屏,垃圾"
                    value={config.filters.blacklistKeywords}
                  />
                  <ArrayField
                    desc="匹配这些正则表达式的消息将被过滤"
                    label="屏蔽正则表达式"
                    multiline
                    onChange={setArrayFilter("blacklistRegex")}
                    placeholder="用逗号分隔多个正则表达式"
                    value={config.filters.blacklistRegex}
                  />
                </>
              ) : (
                <>
                  <ArrayField
                    desc="仅转发以这些前缀开头的消息"
                    label="允许前缀"
                    onChange={setArrayFilter("whitelistPrefixes")}
                    placeholder="用逗号分隔多个前缀，如：#,!,?"
                    value={config.filters.whitelistPrefixes}
                  />
                  <ArrayField
                    desc="仅转发匹配这些正则表达式的消息"
                    label="允许正则表达式"
                    multiline
                    onChange={setArrayFilter("whitelistRegex")}
                    placeholder="用逗号分隔多个正则表达式"
                    value={config.filters.whitelistRegex}
                  />
                </>
              )}
            </SettingsSection>
            <SettingsSection
              description="Minecraft 玩家消息发送到平台时的格式"
              title={
                <span className="inline-flex items-center gap-2">
                  MC → 平台模板 <Badge>游戏到平台</Badge>
                </span>
              }
            >
              <SettingsBlock>
                <MessageTemplateField
                  label="模板内容"
                  multiline
                  onChange={(v) => {
                    setConfig({ ...config, mcToPlatformTemplate: v });
                  }}
                  preview={formatMCToPlatformMessage(
                    config.mcToPlatformTemplate,
                    {
                      message: "Hello world!",
                      playerName: "Steve",
                      playerUUID: "12345678-1234...",
                      serverName: server?.name ?? "",
                      timestamp: Date.now(),
                    },
                  )}
                  previewClassName="text-primary"
                  value={config.mcToPlatformTemplate}
                  variables={MC_TO_PLATFORM_VARS}
                />
              </SettingsBlock>
            </SettingsSection>

            <SettingsSection
              description="平台消息发送到 Minecraft 时的格式"
              title={
                <span className="inline-flex items-center gap-2">
                  平台 → MC 模板 <Badge variant="success">平台到游戏</Badge>
                </span>
              }
            >
              <SettingsBlock>
                <MessageTemplateField
                  label="模板内容"
                  multiline
                  onChange={(v) => {
                    setConfig({ ...config, platformToMcTemplate: v });
                  }}
                  preview={formatPlatformToMCMessage(
                    config.platformToMcTemplate,
                    {
                      message: "Hi everyone!",
                      nickname: "Alice",
                      platform: "Onebot",
                      timestamp: Date.now(),
                      userId: "123456789",
                    },
                  )}
                  value={config.platformToMcTemplate}
                  variables={PLATFORM_TO_MC_VARS}
                />
              </SettingsBlock>
            </SettingsSection>
            <SettingsSection
              description="针对不同目标群聊进行单独配置"
              title="群聊目标配置"
            >
              <SettingsBlock>
                <TargetConfigSheet
                  onSelectedChange={setSelectedId}
                  selectedId={selectedId}
                  serverId={serverId}
                  targets={targets}
                  triggerLabel="选择目标配置"
                >
                  {(target) => (
                    <div className="flex items-center justify-between">
                      <Label>启用聊天同步</Label>
                      <Switch
                        checked={target.config.chatSyncConfigSchema.enabled}
                        onCheckedChange={(v) => {
                          setTargets((prev) =>
                            prev.map((t) =>
                              t.id === target.id
                                ? {
                                    ...t,
                                    config: {
                                      ...t.config,
                                      chatSyncConfigSchema: {
                                        ...t.config.chatSyncConfigSchema,
                                        enabled: v,
                                      },
                                    },
                                  }
                                : t,
                            ),
                          );
                        }}
                      />
                    </div>
                  )}
                </TargetConfigSheet>
              </SettingsBlock>
            </SettingsSection>
          </>
        )}
      </PageContent>
    </>
  );
};
