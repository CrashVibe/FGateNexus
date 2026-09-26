import type { TemplateVariable } from "@/components/target/message-template-field";
import { t } from "@/i18n";

export const PLAYER_NAME_VAR: TemplateVariable = {
  example: "Steve",
  label: t("玩家名称"),
  value: "{playerName}",
};

export const DEATH_MSG_VAR: TemplateVariable = {
  example: t("掉落"),
  label: t("死亡原因"),
  value: "{deathMessage}",
};

export const USER_VAR: TemplateVariable = {
  example: "Steve",
  label: t("玩家名"),
  value: "{user}",
};

export const WHY_VAR: TemplateVariable = {
  example: t("因为某种奇妙の原因"),
  label: t("原因"),
  value: "{why}",
};

export const RENAME_VARS: TemplateVariable[] = [
  { example: "onebot", label: t("平台类型"), value: "{platform}" },
  { example: "Steve", label: t("玩家名"), value: "{playerName}" },
  { example: t("小明"), label: t("社交昵称"), value: "{socialNickname}" },
  { example: "114514", label: t("社交 ID"), value: "{socialUid}" },
];

export const MC_TO_PLATFORM_VARS: TemplateVariable[] = [
  { example: "Hello world!", label: t("消息内容"), value: "{message}" },
  { example: "Steve", label: t("玩家名"), value: "{playerName}" },
  { example: "12345678-1234...", label: t("玩家 UUID"), value: "{playerUUID}" },
  { example: "", label: t("服务器名"), value: "{serverName}" },
  { example: t("时间"), label: t("时间戳"), value: "{timestamp}" },
];

export const PLATFORM_TO_MC_VARS: TemplateVariable[] = [
  { example: "Hi everyone!", label: t("消息内容"), value: "{message}" },
  { example: "Alice", label: t("昵称"), value: "{nickname}" },
  { example: "Onebot", label: t("平台名"), value: "{platform}" },
  { example: t("时间"), label: t("时间戳"), value: "{timestamp}" },
  { example: "123456789", label: t("用户 ID"), value: "{userId}" },
];
