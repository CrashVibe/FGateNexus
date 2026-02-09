<template>
  <n-drawer-content closable title="远程指令配置">
    <n-form :model="selectedTarget" label-width="100">
      <n-form-item label="是否开启此目标的远程指令" required>
        <n-switch v-model:value="selectedTarget.config.CommandConfigSchema.enabled" />
      </n-form-item>
      <n-form-item label="指令前缀">
        <n-input
          v-model:value="selectedTarget.config.CommandConfigSchema.prefix"
          placeholder="请输入指令前缀（可空）"
        />
      </n-form-item>
      <n-form-item v-if="props.target.type === 'group'" label="权限">
        <n-tooltip show-arrow trigger="focus">
          <template #trigger>
            <n-select
              v-model:value="selectedTarget.config.CommandConfigSchema.permissions"
              :options="options"
              multiple
              placeholder="请选择权限"
            />
          </template>
          Tip: 权限相互独立，不存在继承关系
        </n-tooltip>
      </n-form-item>
    </n-form>
    <n-alert v-if="!props.adapterType && props.target.type === 'group'" title="权限提示" type="warning">
      由于你没有选择适配器，无法提供权限提示
    </n-alert>
  </n-drawer-content>
</template>

<script lang="ts" setup>
import { AdapterType } from "~~/shared/schemas/adapter";
import type { targetResponse } from "~~/shared/schemas/server/target";

const props = defineProps<{
  target: targetResponse;
  adapterType?: AdapterType;
}>();

const options = computed(() => {
  if (props.adapterType === AdapterType.Onebot) {
    return [
      { label: "群主", value: "owner" },
      { label: "管理员", value: "admin" },
      { label: "成员", value: "member" }
    ];
  }
  return [];
});

const selectedTarget = computed(() => {
  return props.target;
});
</script>
