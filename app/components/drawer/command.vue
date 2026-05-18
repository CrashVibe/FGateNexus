<template>
  <div class="flex flex-col gap-4">
    <UFormField label="远程指令" description="是否开启此目标的远程指令">
      <USwitch v-model="selectedTarget.config.CommandConfigSchema.enabled" />
    </UFormField>
    <UFormField label="指令前缀">
      <UInput
        v-model="selectedTarget.config.CommandConfigSchema.prefix"
        class="w-full"
        placeholder="请输入指令前缀（可空）"
      />
    </UFormField>
    <UFormField
      v-if="target.type === 'group'"
      label="权限"
      description="权限相互独立，不存在继承关系"
    >
      <USelectMenu
        v-model="selectedTarget.config.CommandConfigSchema.permissions"
        :items="options"
        value-key="value"
        multiple
        class="w-full"
        placeholder="请选择权限"
      />
    </UFormField>
    <UAlert
      v-if="!platformType && target.type === 'group'"
      title="权限提示"
      color="warning"
      variant="subtle"
      icon="i-lucide-triangle-alert"
      description="由于你没有选择 Bot 实例，无法提供权限提示"
    />
  </div>
</template>

<script lang="ts" setup>
import { PlatformType } from "~~/shared/model/bot/types";

import type { targetResponse } from "#shared/model/server/schema/target";
import { BotData } from "~/composables/api";

const {
  target,
  platformType = null,
  botId = null,
} = defineProps<{
  target: targetResponse;
  platformType?: PlatformType;
  botId?: number;
}>();

const onebotOptions = [
  { label: "群主", value: "owner" },
  { label: "管理员", value: "admin" },
  { label: "成员", value: "member" },
];

const options = ref<{ label: string; value: string }[]>([]);

const loadOptions = async () => {
  if (platformType === PlatformType.Onebot) {
    options.value = onebotOptions;
    return;
  }

  if (
    platformType === PlatformType.Discord &&
    botId !== null &&
    target.type === "group" &&
    target.guildId !== null
  ) {
    try {
      options.value = await BotData.getDiscordRoles(botId, target.guildId);
      return;
    } catch {
      options.value = [];
      return;
    }
  }

  options.value = [];
};

watch(
  () => [platformType, botId, target.type, target.channelId],
  () => {
    void loadOptions();
  },
  { immediate: true },
);

const selectedTarget = computed(() => target);
</script>
