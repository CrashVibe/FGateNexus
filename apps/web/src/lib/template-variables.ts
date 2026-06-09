import type { TemplateVariable } from "@/components/target/message-template-field";

export const PLAYER_NAME_VAR: TemplateVariable = {
  example: "Steve",
  label: "玩家名称",
  value: "{playerName}",
};

export const DEATH_MSG_VAR: TemplateVariable = {
  example: "掉落",
  label: "死亡原因",
  value: "{deathMessage}",
};

export const USER_VAR: TemplateVariable = {
  example: "Steve",
  label: "玩家名",
  value: "{user}",
};

export const WHY_VAR: TemplateVariable = {
  example: "因为某种奇妙の原因",
  label: "原因",
  value: "{why}",
};

export const RENAME_VARS: TemplateVariable[] = [
  { example: "onebot", label: "平台类型", value: "{platform}" },
  { example: "Steve", label: "玩家名", value: "{playerName}" },
  { example: "小明", label: "社交昵称", value: "{socialNickname}" },
  { example: "114514", label: "社交 ID", value: "{socialUid}" },
];

export const MC_TO_PLATFORM_VARS: TemplateVariable[] = [
  { example: "Hello world!", label: "消息内容", value: "{message}" },
  { example: "Steve", label: "玩家名", value: "{playerName}" },
  { example: "12345678-1234...", label: "玩家 UUID", value: "{playerUUID}" },
  { example: "", label: "服务器名", value: "{serverName}" },
  { example: "时间", label: "时间戳", value: "{timestamp}" },
];

export const PLATFORM_TO_MC_VARS: TemplateVariable[] = [
  { example: "Hi everyone!", label: "消息内容", value: "{message}" },
  { example: "Alice", label: "昵称", value: "{nickname}" },
  { example: "Onebot", label: "平台名", value: "{platform}" },
  { example: "时间", label: "时间戳", value: "{timestamp}" },
  { example: "123456789", label: "用户 ID", value: "{userId}" },
];
