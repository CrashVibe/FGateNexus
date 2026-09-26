import { useParams } from "@tanstack/react-router";
import { useState } from "react";

import type { ChatSyncConfig } from "#shared/model/server/schema/chat-sync";
import {
  formatMCToPlatformMessage,
  formatPlatformToMCMessage,
  getFilterReason,
} from "#shared/utils/chat-sync";
import {
  SettingsBlock,
  SettingsRow,
  SettingsSection,
} from "@/components/common/settings-section";
import { ServerSettingsPage } from "@/components/layout/server-settings-page";
import { MessageTemplateField } from "@/components/target/message-template-field";
import { TargetsHint } from "@/components/target/targets-hint";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { NumberInput } from "@/components/ui/number-input";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useServerForm } from "@/hooks/use-server-form";
import { t } from "@/i18n";
import { ChatSyncData } from "@/lib/api";
import {
  MC_TO_PLATFORM_VARS,
  PLATFORM_TO_MC_VARS,
} from "@/lib/template-variables";
import { useServer } from "@/queries/servers";

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

// 过滤规则试一试：用当前（未保存的）配置判断
const FilterTester = ({ config }: { config: ChatSyncConfig }) => {
  const [text, setText] = useState("");
  const reason = text ? getFilterReason(text, config) : null;
  return (
    <SettingsBlock>
      <div className="space-y-1.5">
        <p className="text-sm font-medium">{t("试一试")}</p>
        <Input
          onChange={(e) => {
            setText(e.target.value);
          }}
          placeholder={t("输入一条消息，看看会不会被转发")}
          value={text}
        />
        {text ? (
          <p
            className={
              reason === null
                ? "text-xs text-success"
                : "text-destructive text-xs"
            }
          >
            {reason === null
              ? t("会转发 ✓")
              : t("不会转发：{{reason}}", { reason })}
          </p>
        ) : null}
      </div>
    </SettingsBlock>
  );
};

export const ServerMsgbridgePage = () => {
  const { id } = useParams({ from: "/dashboard/servers/$id/msgbridge" });
  const serverId = Number(id);

  const { data: server } = useServer(serverId);
  const {
    form: draft,
    guard,
    section,
    setForm: setConfig,
  } = useServerForm(
    server?.chatSyncConfig,
    (c) => structuredClone(c),
    async (chatsync) => {
      await ChatSyncData.patch(serverId, { chatsync });
    },
  );

  const setFilter = (patch: Partial<ChatSyncConfig["filters"]>): void => {
    if (draft) {
      setConfig({ ...draft, filters: { ...draft.filters, ...patch } });
    }
  };
  const setArrayFilter = (key: ArrayFilterKey) => (next: string[]) => {
    setFilter({ [key]: next });
  };

  return (
    <ServerSettingsPage guard={guard} value={draft}>
      {(config) => (
        <>
          <TargetsHint feature={t("互通消息")} serverId={serverId} />
          <SettingsSection
            description={t("控制聊天同步功能的启用状态及消息方向")}
            save={section(["mcToPlatformEnabled", "platformToMcEnabled"])}
            title={t("聊天同步")}
          >
            <SettingsRow
              description={t("将 Minecraft 玩家消息转发到聊天平台")}
              label={t("MC → 平台")}
            >
              <Switch
                checked={config.mcToPlatformEnabled}
                onCheckedChange={(v) => {
                  setConfig({ ...config, mcToPlatformEnabled: v });
                }}
              />
            </SettingsRow>
            <SettingsRow
              description={t("将聊天平台消息转发到 Minecraft 服务器")}
              label={t("平台 → MC")}
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
            description={t("配置消息长度限制和内容过滤规则")}
            save={section(["filters"])}
            title={t("消息过滤")}
          >
            <SettingsRow
              description={t("低于此长度的消息将被忽略")}
              label={t("最小长度")}
            >
              <NumberInput
                className="w-full text-right sm:w-28"
                onChange={(minMessageLength) => {
                  setFilter({ minMessageLength });
                }}
                value={config.filters.minMessageLength}
              />
            </SettingsRow>
            <SettingsRow
              description={t("超过此长度的消息将被截断或忽略")}
              label={t("最大长度")}
            >
              <NumberInput
                className="w-full text-right sm:w-28"
                onChange={(maxMessageLength) => {
                  setFilter({ maxMessageLength });
                }}
                value={config.filters.maxMessageLength}
              />
            </SettingsRow>
            <SettingsRow label={t("过滤模式")}>
              <Tabs
                onValueChange={(v) => {
                  setFilter({ filterMode: v as "blacklist" | "whitelist" });
                }}
                value={config.filters.filterMode}
              >
                <TabsList>
                  <TabsTrigger value="blacklist">{t("黑名单")}</TabsTrigger>
                  <TabsTrigger value="whitelist">{t("白名单")}</TabsTrigger>
                </TabsList>
              </Tabs>
            </SettingsRow>
            {config.filters.filterMode === "blacklist" ? (
              <>
                <ArrayField
                  desc={t("包含这些关键词的消息将被过滤，不会转发")}
                  label={t("屏蔽关键词")}
                  onChange={setArrayFilter("blacklistKeywords")}
                  placeholder={t("用逗号分隔多个关键词，如：广告,刷屏,垃圾")}
                  value={config.filters.blacklistKeywords}
                />
                <ArrayField
                  desc={t("匹配这些正则表达式的消息将被过滤")}
                  label={t("屏蔽正则表达式")}
                  multiline
                  onChange={setArrayFilter("blacklistRegex")}
                  placeholder={t("用逗号分隔多个正则表达式")}
                  value={config.filters.blacklistRegex}
                />
              </>
            ) : (
              <>
                <ArrayField
                  desc={t("仅转发以这些前缀开头的消息")}
                  label={t("允许前缀")}
                  onChange={setArrayFilter("whitelistPrefixes")}
                  placeholder={t("用逗号分隔多个前缀，如：#,!,?")}
                  value={config.filters.whitelistPrefixes}
                />
                <ArrayField
                  desc={t("仅转发匹配这些正则表达式的消息")}
                  label={t("允许正则表达式")}
                  multiline
                  onChange={setArrayFilter("whitelistRegex")}
                  placeholder={t("用逗号分隔多个正则表达式")}
                  value={config.filters.whitelistRegex}
                />
              </>
            )}
            <FilterTester config={config} />
          </SettingsSection>
          <SettingsSection
            description={t("Minecraft 玩家消息发送到平台时的格式")}
            save={section(["mcToPlatformTemplate"])}
            title={
              <span className="inline-flex items-center gap-2">
                {t("MC → 平台模板")} <Badge>{t("游戏到平台")}</Badge>
              </span>
            }
          >
            <SettingsBlock>
              <MessageTemplateField
                label={t("模板内容")}
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
            description={t("平台消息发送到 Minecraft 时的格式")}
            save={section(["platformToMcTemplate"])}
            title={
              <span className="inline-flex items-center gap-2">
                {t("平台 → MC 模板")}{" "}
                <Badge variant="success">{t("平台到游戏")}</Badge>
              </span>
            }
          >
            <SettingsBlock>
              <MessageTemplateField
                label={t("模板内容")}
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
        </>
      )}
    </ServerSettingsPage>
  );
};
