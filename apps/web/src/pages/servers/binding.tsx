import { useParams } from "@tanstack/react-router";
import dayjs from "dayjs";
import { useMemo } from "react";
import type { z } from "zod";

import type { BindingConfigSchema } from "#shared/model/server/schema/binding";
import { CODE_MODES } from "#shared/model/server/schema/binding";
import { generateVerificationCode } from "#shared/utils/binding";
import {
  renderBindFail,
  renderBindRenameName,
  renderBindSuccess,
  renderNoBindKick,
  renderUnbindFail,
  renderUnbindKick,
  renderUnbindSuccess,
} from "#shared/utils/template/binding";
import { LoadingState } from "@/components/common/loading-state";
import { MinecraftText } from "@/components/common/minecraft-text";
import { SettingsColumns } from "@/components/common/settings-columns";
import {
  SettingsBlock,
  SettingsRow,
  SettingsSection,
} from "@/components/common/settings-section";
import { PageContent } from "@/components/layout/page-content";
import { ServerHeader } from "@/components/layout/server-header";
import { MessageTemplateField } from "@/components/target/message-template-field";
import { Input } from "@/components/ui/input";
import { NumberInput } from "@/components/ui/number-input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useServerForm } from "@/hooks/use-server-form";
import { t } from "@/i18n";
import { BindingData } from "@/lib/api";
import { RENAME_VARS, USER_VAR, WHY_VAR } from "@/lib/template-variables";
import { useServer } from "@/queries/servers";

type Config = z.infer<typeof BindingConfigSchema>;

const CODE_MODE_OPTIONS = [
  { label: t("纯数字"), value: CODE_MODES.NUMBER },
  { label: t("纯单词 (小写)"), value: CODE_MODES.LOWER },
  { label: t("纯单词 (大写)"), value: CODE_MODES.UPPER },
  { label: t("纯单词 (大小写)"), value: CODE_MODES.WORD },
  { label: t("大小写单词和数字"), value: CODE_MODES.MIX },
];

export const ServerBindingPage = () => {
  const { id } = useParams({ from: "/dashboard/servers/$id/binding" });
  const serverId = Number(id);

  const { data: server, refetch } = useServer(serverId);
  const {
    form: config,
    guard,
    section,
    setForm: setConfig,
  } = useServerForm(
    server?.bindingConfig,
    (c) => structuredClone(c),
    async (c) => {
      await BindingData.patch(serverId, { config: c });
      await refetch();
    },
  );

  const set = (patch: Partial<Config>): void => {
    if (config) {
      setConfig({ ...config, ...patch });
    }
  };

  const examples = useMemo(() => {
    if (!config) {
      return null;
    }
    const code = generateVerificationCode(config.codeMode, config.codeLength);
    return {
      bindCommand: config.prefix + code,
      expireTime: dayjs()
        .add(config.codeExpire, "minute")
        .format("YYYY-MM-DD HH:mm:ss"),
      unbindCommand: `${config.unbindPrefix}Steve`,
    };
  }, [config]);

  return (
    <>
      {guard}
      <ServerHeader width="settings" />
      <PageContent width="settings">
        {config === null || examples === null ? (
          <LoadingState />
        ) : (
          <SettingsColumns>
            <SettingsSection
              description={t("验证码与绑定数量配置")}
              save={section([
                "maxBindCount",
                "codeLength",
                "codeMode",
                "codeExpire",
              ])}
              title={t("绑定参数")}
            >
              <SettingsRow label={t("绑定数量")}>
                <NumberInput
                  className="w-full text-right sm:w-28"
                  onChange={(maxBindCount) => {
                    set({ maxBindCount });
                  }}
                  value={config.maxBindCount}
                />
              </SettingsRow>
              <SettingsRow label={t("验证码长度")}>
                <NumberInput
                  className="w-full text-right sm:w-28"
                  onChange={(codeLength) => {
                    set({ codeLength });
                  }}
                  value={config.codeLength}
                />
              </SettingsRow>
              <SettingsRow label={t("验证码模式")}>
                <Select
                  onValueChange={(v) => {
                    set({ codeMode: v as CODE_MODES });
                  }}
                  value={config.codeMode}
                >
                  <SelectTrigger className="w-full sm:w-56">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CODE_MODE_OPTIONS.map((o) => (
                      <SelectItem key={o.value} value={o.value}>
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </SettingsRow>
              <SettingsRow label={t("过期时间（分钟）")}>
                <NumberInput
                  className="w-full text-right sm:w-28"
                  onChange={(codeExpire) => {
                    set({ codeExpire });
                  }}
                  value={config.codeExpire}
                />
              </SettingsRow>
            </SettingsSection>

            <SettingsSection
              description={t("绑定/解绑前缀与开关")}
              save={section([
                "prefix",
                "unbindPrefix",
                "allowUnbind",
                "allowGroupUnbind",
              ])}
              title={t("指令配置")}
            >
              <SettingsRow
                description={t(
                  "玩家在社交平台聊天中发送此前缀加验证码完成绑定",
                )}
                label={t("绑定前缀")}
              >
                <Input
                  className="w-full sm:w-56"
                  maxLength={50}
                  onChange={(e) => {
                    set({ prefix: e.target.value });
                  }}
                  placeholder={t("如：/绑定 ")}
                  value={config.prefix}
                />
              </SettingsRow>
              <SettingsRow
                description={t("玩家发送此前缀加游戏名完成解绑")}
                label={t("解绑前缀")}
              >
                <Input
                  className="w-full sm:w-56"
                  maxLength={50}
                  onChange={(e) => {
                    set({ unbindPrefix: e.target.value });
                  }}
                  placeholder={t("如：/解绑 ")}
                  value={config.unbindPrefix}
                />
              </SettingsRow>
              <SettingsRow label={t("允许解绑")}>
                <Switch
                  checked={config.allowUnbind}
                  onCheckedChange={(v) => {
                    set({ allowUnbind: v });
                  }}
                />
              </SettingsRow>
              <SettingsRow
                description={t("玩家退出绑定群组后自动解除账号绑定")}
                label={t("离群自动解绑")}
              >
                <Switch
                  checked={config.allowGroupUnbind}
                  onCheckedChange={(v) => {
                    set({ allowGroupUnbind: v });
                  }}
                />
              </SettingsRow>
            </SettingsSection>

            <SettingsSection
              description={t("根据当前配置生成的示例指令")}
              title={t("指令预览")}
            >
              <SettingsBlock>
                <div className="space-y-1">
                  <p className="text-sm font-medium text-green-500">
                    {t("绑定指令")}
                  </p>
                  <p className="text-muted-foreground text-xs">
                    {t("用户在社交平台聊天中发送此指令来绑定游戏账号")}
                  </p>
                  <code className="bg-muted block rounded px-3 py-2 font-mono text-sm">
                    {examples.bindCommand}
                  </code>
                </div>
              </SettingsBlock>
              {config.allowUnbind ? (
                <SettingsBlock>
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-amber-500">
                      {t("解绑指令")}
                    </p>
                    <p className="text-muted-foreground text-xs">
                      {t("使用专用解绑前缀进行解绑操作，直接输入玩家名称即可")}
                    </p>
                    <code className="bg-muted block rounded px-3 py-2 font-mono text-sm">
                      {examples.unbindCommand}
                    </code>
                  </div>
                </SettingsBlock>
              ) : null}
            </SettingsSection>
            <SettingsSection
              description={t("绑定成功/失败时的消息")}
              save={section(["bindSuccessMsg", "bindFailMsg"])}
              title={t("绑定反馈")}
            >
              <SettingsBlock>
                <MessageTemplateField
                  label={t("绑定成功")}
                  maxLength={200}
                  onChange={(v) => {
                    set({ bindSuccessMsg: v });
                  }}
                  preview={renderBindSuccess(config.bindSuccessMsg, "Steve")}
                  value={config.bindSuccessMsg}
                  variables={[USER_VAR]}
                />
              </SettingsBlock>
              <SettingsBlock>
                <MessageTemplateField
                  label={t("绑定失败")}
                  maxLength={200}
                  onChange={(v) => {
                    set({ bindFailMsg: v });
                  }}
                  preview={renderBindFail(
                    config.bindFailMsg,
                    "Steve",
                    t("因为某种奇妙の原因"),
                  )}
                  previewClassName="text-destructive"
                  value={config.bindFailMsg}
                  variables={[USER_VAR, WHY_VAR]}
                />
              </SettingsBlock>
            </SettingsSection>

            <SettingsSection
              description={t("解绑成功/失败时的消息")}
              save={section(["unbindSuccessMsg", "unbindFailMsg"])}
              title={t("解绑反馈")}
            >
              <SettingsBlock>
                <MessageTemplateField
                  label={t("解绑成功")}
                  maxLength={200}
                  onChange={(v) => {
                    set({ unbindSuccessMsg: v });
                  }}
                  preview={renderUnbindSuccess(
                    config.unbindSuccessMsg,
                    "Steve",
                  )}
                  value={config.unbindSuccessMsg}
                  variables={[USER_VAR]}
                />
              </SettingsBlock>
              <SettingsBlock>
                <MessageTemplateField
                  label={t("解绑失败")}
                  maxLength={200}
                  onChange={(v) => {
                    set({ unbindFailMsg: v });
                  }}
                  preview={renderUnbindFail(
                    config.unbindFailMsg,
                    "Steve",
                    t("因为某种奇妙の原因"),
                  )}
                  previewClassName="text-destructive"
                  value={config.unbindFailMsg}
                  variables={[USER_VAR, WHY_VAR]}
                />
              </SettingsBlock>
            </SettingsSection>
            <SettingsSection
              description={t("开关与群昵称改名模板")}
              save={section(["autoRenameEnabled", "autoRenameNameTemplate"])}
              title={t("改名配置")}
            >
              <SettingsRow label={t("绑定后自动改名")}>
                <Switch
                  checked={config.autoRenameEnabled}
                  onCheckedChange={(v) => {
                    set({ autoRenameEnabled: v });
                  }}
                />
              </SettingsRow>
              <SettingsBlock>
                <MessageTemplateField
                  label={t("改名模板")}
                  maxLength={32}
                  onChange={(v) => {
                    set({ autoRenameNameTemplate: v });
                  }}
                  preview={renderBindRenameName(config.autoRenameNameTemplate, {
                    platform: "onebot",
                    playerName: "Steve",
                    socialNickname: t("小明"),
                    socialUid: "114514",
                  })}
                  previewClassName="text-primary"
                  value={config.autoRenameNameTemplate}
                  variables={RENAME_VARS}
                />
              </SettingsBlock>
            </SettingsSection>
            <SettingsSection
              description={t("未绑定玩家的处理方式")}
              save={section(["forceBind", "nobindkickMsg"])}
              title={t("强制绑定")}
            >
              <SettingsRow
                description={t("未绑定账号的玩家进入服务器时将被踢出")}
                label={t("强制绑定")}
              >
                <Switch
                  checked={config.forceBind}
                  onCheckedChange={(v) => {
                    set({ forceBind: v });
                  }}
                />
              </SettingsRow>
              <SettingsBlock>
                <MessageTemplateField
                  label={t("未绑定踢出消息")}
                  maxLength={500}
                  multiline
                  onChange={(v) => {
                    set({ nobindkickMsg: v });
                  }}
                  previewNode={
                    <MinecraftText
                      text={renderNoBindKick(
                        config.nobindkickMsg,
                        "Steve",
                        examples.bindCommand,
                        examples.expireTime,
                      )}
                    />
                  }
                  rows={3}
                  value={config.nobindkickMsg}
                  variables={[
                    {
                      example: examples.bindCommand,
                      label: t("消息"),
                      value: "{message}",
                    },
                    {
                      example: "Steve",
                      label: t("玩家名"),
                      value: "{name}",
                    },
                    {
                      example: examples.expireTime,
                      label: t("过期时间"),
                      value: "{time}",
                    },
                  ]}
                />
              </SettingsBlock>
            </SettingsSection>

            <SettingsSection
              description={t("解绑后的踢出消息配置")}
              save={section(["unbindkickMsg"])}
              title={t("解绑踢出")}
            >
              <SettingsBlock>
                <MessageTemplateField
                  label={t("解绑踢出消息")}
                  maxLength={500}
                  multiline
                  onChange={(v) => {
                    set({ unbindkickMsg: v });
                  }}
                  previewNode={
                    <MinecraftText
                      text={renderUnbindKick(config.unbindkickMsg, "114514")}
                    />
                  }
                  value={config.unbindkickMsg}
                  variables={[
                    {
                      example: "114514",
                      label: t("社交账号"),
                      value: "{social_account}",
                    },
                  ]}
                />
              </SettingsBlock>
            </SettingsSection>
          </SettingsColumns>
        )}
      </PageContent>
    </>
  );
};
