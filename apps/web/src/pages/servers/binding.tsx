import { useLocation, useParams } from "@tanstack/react-router";
import dayjs from "dayjs";
import { MessageSquare, Settings, ShieldAlert, UserPen } from "lucide-react";
import { useMemo, useState } from "react";
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
import {
  SettingsBlock,
  SettingsRow,
  SettingsSection,
  SubPageLayout,
} from "@/components/common/settings-section";
import type { SubNavItem } from "@/components/common/settings-section";
import { useLayout } from "@/components/layout/context";
import { MessageTemplateField } from "@/components/target/message-template-field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useServerForm } from "@/hooks/use-server-form";
import { BindingData } from "@/lib/api";
import { findMenuNode } from "@/lib/menu";
import { RENAME_VARS, USER_VAR, WHY_VAR } from "@/lib/template-variables";
import { useServer } from "@/queries/servers";
import { usePageStateStore } from "@/stores/page-state";

type Config = z.infer<typeof BindingConfigSchema>;

const CODE_MODE_OPTIONS = [
  { label: "纯数字", value: CODE_MODES.NUMBER },
  { label: "纯单词 (小写)", value: CODE_MODES.LOWER },
  { label: "纯单词 (大写)", value: CODE_MODES.UPPER },
  { label: "纯单词 (大小写)", value: CODE_MODES.WORD },
  { label: "大小写单词和数字", value: CODE_MODES.MIX },
];

const NAV_ITEMS: SubNavItem[] = [
  {
    description: "绑定码、白名单",
    icon: Settings,
    label: "基础设置",
    value: "basic",
  },
  {
    description: "绑定成功/失败提示",
    icon: MessageSquare,
    label: "反馈消息",
    value: "messages",
  },
  {
    description: "绑定后自动修改名称",
    icon: UserPen,
    label: "自动改名",
    value: "autorename",
  },
  {
    description: "踢出未绑定玩家",
    icon: ShieldAlert,
    label: "绑定提示",
    value: "kick",
  },
];

// oxlint-disable-next-line eslint/complexity
export const ServerBindingPage = () => {
  const { id } = useParams({ from: "/dashboard/servers/$id/binding" });
  const serverId = Number(id);
  const { menu } = useLayout();
  const { pathname } = useLocation();
  const node = findMenuNode(menu, pathname);
  const dirty = usePageStateStore((s) => s.dirty);
  const savePage = usePageStateStore((s) => s.savePage);
  const cancelPage = usePageStateStore((s) => s.cancelPage);

  const { data: server, refetch } = useServer(serverId);
  const { form: config, setForm: setConfig } = useServerForm(
    server?.bindingConfig,
    (c) => structuredClone(c),
    async (c) => {
      await BindingData.patch(serverId, { config: c });
      await refetch();
    },
    { successMessage: "绑定配置已保存" },
  );
  const [section, setSection] = useState("basic");

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

  if (!(config && examples)) {
    return (
      <>
        <div className="flex-1 overflow-y-auto p-6">
          <LoadingState />
        </div>
      </>
    );
  }

  const dirtyActions = dirty ? (
    <div className="flex gap-2">
      <Button onClick={cancelPage} size="sm" variant="secondary">
        取消更改
      </Button>
      <Button
        onClick={() => {
          void savePage();
        }}
        size="sm"
      >
        保存配置
      </Button>
    </div>
  ) : undefined;

  return (
    <SubPageLayout
      headerActions={dirtyActions}
      items={NAV_ITEMS}
      onChange={setSection}
      title={node?.label ?? "账号绑定"}
      value={section}
    >
      {section === "basic" && (
        <>
          <SettingsSection description="验证码与绑定数量配置" title="绑定参数">
            <SettingsRow label="绑定数量">
              <Input
                className="w-28 text-right"
                onChange={(e) => {
                  set({ maxBindCount: Number(e.target.value) });
                }}
                type="number"
                value={config.maxBindCount}
              />
            </SettingsRow>
            <SettingsRow label="验证码长度">
              <Input
                className="w-28 text-right"
                onChange={(e) => {
                  set({ codeLength: Number(e.target.value) });
                }}
                type="number"
                value={config.codeLength}
              />
            </SettingsRow>
            <SettingsRow label="验证码模式">
              <Select
                onValueChange={(v) => {
                  set({ codeMode: v as CODE_MODES });
                }}
                value={config.codeMode}
              >
                <SelectTrigger className="w-48">
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
            <SettingsRow label="过期时间（分钟）">
              <Input
                className="w-28 text-right"
                onChange={(e) => {
                  set({ codeExpire: Number(e.target.value) });
                }}
                type="number"
                value={config.codeExpire}
              />
            </SettingsRow>
          </SettingsSection>

          <SettingsSection description="绑定/解绑前缀与开关" title="指令配置">
            <SettingsRow
              description="玩家在社交平台聊天中发送此前缀加验证码完成绑定"
              label="绑定前缀"
            >
              <Input
                className="w-52"
                maxLength={50}
                onChange={(e) => {
                  set({ prefix: e.target.value });
                }}
                placeholder="如：/绑定 "
                value={config.prefix}
              />
            </SettingsRow>
            <SettingsRow
              description="玩家发送此前缀加游戏名完成解绑"
              label="解绑前缀"
            >
              <Input
                className="w-52"
                maxLength={50}
                onChange={(e) => {
                  set({ unbindPrefix: e.target.value });
                }}
                placeholder="如：/解绑 "
                value={config.unbindPrefix}
              />
            </SettingsRow>
            <SettingsRow label="允许解绑">
              <Switch
                checked={config.allowUnbind}
                onCheckedChange={(v) => {
                  set({ allowUnbind: v });
                }}
              />
            </SettingsRow>
            <SettingsRow
              description="玩家退出绑定群组后自动解除账号绑定"
              label="离群自动解绑"
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
            description="根据当前配置生成的示例指令"
            title="指令预览"
          >
            <SettingsBlock>
              <div className="space-y-1">
                <p className="text-sm font-medium text-green-500">绑定指令</p>
                <p className="text-muted-foreground text-xs">
                  用户在社交平台聊天中发送此指令来绑定游戏账号
                </p>
                <code className="bg-muted block rounded px-3 py-2 font-mono text-sm">
                  {examples.bindCommand}
                </code>
              </div>
            </SettingsBlock>
            {config.allowUnbind ? (
              <SettingsBlock>
                <div className="space-y-1">
                  <p className="text-sm font-medium text-amber-500">解绑指令</p>
                  <p className="text-muted-foreground text-xs">
                    使用专用解绑前缀进行解绑操作，直接输入玩家名称即可
                  </p>
                  <code className="bg-muted block rounded px-3 py-2 font-mono text-sm">
                    {examples.unbindCommand}
                  </code>
                </div>
              </SettingsBlock>
            ) : null}
          </SettingsSection>
        </>
      )}

      {section === "messages" && (
        <>
          <SettingsSection description="绑定成功/失败时的消息" title="绑定反馈">
            <SettingsBlock>
              <MessageTemplateField
                label="绑定成功"
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
                label="绑定失败"
                maxLength={200}
                onChange={(v) => {
                  set({ bindFailMsg: v });
                }}
                preview={renderBindFail(
                  config.bindFailMsg,
                  "Steve",
                  "因为某种奇妙の原因",
                )}
                previewClassName="text-destructive"
                value={config.bindFailMsg}
                variables={[USER_VAR, WHY_VAR]}
              />
            </SettingsBlock>
          </SettingsSection>

          <SettingsSection description="解绑成功/失败时的消息" title="解绑反馈">
            <SettingsBlock>
              <MessageTemplateField
                label="解绑成功"
                maxLength={200}
                onChange={(v) => {
                  set({ unbindSuccessMsg: v });
                }}
                preview={renderUnbindSuccess(config.unbindSuccessMsg, "Steve")}
                value={config.unbindSuccessMsg}
                variables={[USER_VAR]}
              />
            </SettingsBlock>
            <SettingsBlock>
              <MessageTemplateField
                label="解绑失败"
                maxLength={200}
                onChange={(v) => {
                  set({ unbindFailMsg: v });
                }}
                preview={renderUnbindFail(
                  config.unbindFailMsg,
                  "Steve",
                  "因为某种奇妙の原因",
                )}
                previewClassName="text-destructive"
                value={config.unbindFailMsg}
                variables={[USER_VAR, WHY_VAR]}
              />
            </SettingsBlock>
          </SettingsSection>
        </>
      )}

      {section === "autorename" && (
        <SettingsSection description="开关与群昵称改名模板" title="改名配置">
          <SettingsRow label="绑定后自动改名">
            <Switch
              checked={config.autoRenameEnabled}
              onCheckedChange={(v) => {
                set({ autoRenameEnabled: v });
              }}
            />
          </SettingsRow>
          <SettingsBlock>
            <MessageTemplateField
              label="改名模板"
              maxLength={32}
              onChange={(v) => {
                set({ autoRenameNameTemplate: v });
              }}
              preview={renderBindRenameName(config.autoRenameNameTemplate, {
                platform: "onebot",
                playerName: "Steve",
                socialNickname: "小明",
                socialUid: "114514",
              })}
              previewClassName="text-primary"
              value={config.autoRenameNameTemplate}
              variables={RENAME_VARS}
            />
          </SettingsBlock>
        </SettingsSection>
      )}

      {section === "kick" && (
        <>
          <SettingsSection description="未绑定玩家的处理方式" title="强制绑定">
            <SettingsRow
              description="未绑定账号的玩家进入服务器时将被踢出"
              label="强制绑定"
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
                label="未绑定踢出消息"
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
                    label: "消息",
                    value: "{message}",
                  },
                  {
                    example: "Steve",
                    label: "玩家名",
                    value: "{name}",
                  },
                  {
                    example: examples.expireTime,
                    label: "过期时间",
                    value: "{time}",
                  },
                ]}
              />
            </SettingsBlock>
          </SettingsSection>

          <SettingsSection description="解绑后的踢出消息配置" title="解绑踢出">
            <SettingsBlock>
              <MessageTemplateField
                label="解绑踢出消息"
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
                    label: "社交账号",
                    value: "{social_account}",
                  },
                ]}
              />
            </SettingsBlock>
          </SettingsSection>
        </>
      )}
    </SubPageLayout>
  );
};
