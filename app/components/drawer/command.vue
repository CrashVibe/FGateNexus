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
      v-if="!adapterType && target.type === 'group'"
      title="权限提示"
      color="warning"
      variant="subtle"
      icon="i-lucide-triangle-alert"
      description="由于你没有选择适配器，无法提供权限提示"
    />
  </div>
</template>

<script lang="ts" setup>
import { AdapterType } from "#shared/model/adapter";
import type { targetResponse } from "#shared/model/server/target";

const { target, adapterType = null } = defineProps<{
  target: targetResponse;
  adapterType?: AdapterType;
}>();

const options = computed(() => {
  if (adapterType === AdapterType.Onebot) {
    return [
      { label: "群主", value: "owner" },
      { label: "管理员", value: "admin" },
      { label: "成员", value: "member" },
    ];
  }
  return [];
});

const selectedTarget = computed(() => target);
</script>
