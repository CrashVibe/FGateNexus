<template>
  <n-drawer-content closable title="远程指令配置">
    <n-form :model="selectedTarget" label-width="100">
      <n-form-item label="指令前缀">
        <n-input v-model:value="selectedTarget.prefix" placeholder="请输入指令前缀（可空）" />
      </n-form-item>
      <n-form-item v-if="props.target.type === 'group'" label="权限">
        <n-tooltip show-arrow trigger="focus">
          <template #trigger>
            <n-select v-model:value="selectedTarget.permissions" multiple placeholder="请选择权限" :options="options" />
          </template>
          Tip: 权限相互独立，不存在继承关系
        </n-tooltip>
      </n-form-item>
    </n-form>
    <n-alert v-if="!props.adapterType && props.target.type === 'group'" title="权限提示" type="warning">
      由于你没有选择适配器，无法提供权限提示
    </n-alert>
    <template #footer>
      <div class="flex justify-end gap-3">
        <n-button :disabled="loading" :loading="loading" type="primary" @click="handleSave">保存</n-button>
      </div>
    </template>
  </n-drawer-content>
</template>

<script setup lang="ts">
import { AdapterType } from "~~/shared/schemas/adapter";
import type { CommandTarget } from "~~/shared/schemas/server/command";

const loading = ref(false);

const props = defineProps<{
  target: CommandTarget;
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

const emit = defineEmits<{
  save: [data: CommandTarget];
}>();

const handleSave = async () => {
  try {
    loading.value = true;
    emit("save", selectedTarget.value);
  } catch {
    return;
  } finally {
    loading.value = false;
  }
};
</script>
