<script lang="ts" setup>
import type { AdapterAPI, AdapterWithStatus } from "#shared/schemas/adapter";
import type { FormInst } from "naive-ui";
import type z from "zod";

const props = defineProps<{
  adapter: AdapterWithStatus;
}>();

const emit = defineEmits<{
  save: [adapterID: number, data: z.infer<typeof AdapterAPI.POST.request>];
  delete: [adapterID: number];
  toggle: [adapterID: number, enabled: boolean];
}>();

const formRef = ref<FormInst>();
const loading = ref(false);

const formData = ref<z.infer<typeof AdapterAPI.POST.request>>({
  type: props.adapter.type,
  config: props.adapter.config,
  name: props.adapter.name
});

const handleSave = async () => {
  try {
    await formRef.value?.validate();
    loading.value = true;
    emit("save", props.adapter.id, formData.value);
  } catch {
    return;
  } finally {
    loading.value = false;
  }
};

const handleDelete = () => {
  emit("delete", props.adapter.id);
};

const handleToggle = () => {
  loading.value = true;
  emit("toggle", props.adapter.id, !props.adapter.enabled);
  loading.value = false;
};
</script>
<template>
  <n-drawer-content closable title="配置修改">
    <div class="flex flex-col gap-6">
      <selector-bot ref="formRef" v-model="formData" :is-edit="true" />
    </div>
    <template #footer>
      <div class="flex justify-end gap-3">
        <n-button :disabled="loading" :loading="loading" ghost type="error" @click="handleDelete">删除</n-button>
        <n-button :disabled="loading" :loading="loading" type="default" @click="handleToggle">
          {{ props.adapter.enabled ? "禁用" : "启用" }}
        </n-button>
        <n-button :disabled="loading" :loading="loading" type="primary" @click="handleSave">保存</n-button>
      </div>
    </template>
  </n-drawer-content>
</template>
