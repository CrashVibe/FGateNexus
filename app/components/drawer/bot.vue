<script lang="ts" setup>
import type { z } from "zod";

import type { AdapterAPI, AdapterWithStatus } from "#shared/model/adapter";

const { adapter } = defineProps<{
  adapter: AdapterWithStatus;
}>();

const emit = defineEmits<{
  save: [adapterID: number, data: z.infer<typeof AdapterAPI.POST.request>];
  delete: [adapterID: number];
  toggle: [adapterID: number, enabled: boolean];
}>();

const loading = ref(false);

const formData = ref<z.infer<typeof AdapterAPI.POST.request>>({
  config: adapter.config,
  name: adapter.name,
  type: adapter.type,
});

const handleSave = async () => {
  loading.value = true;
  try {
    emit("save", adapter.id, formData.value);
  } finally {
    loading.value = false;
  }
};

const handleDelete = () => {
  emit("delete", adapter.id);
};

const handleToggle = () => {
  emit("toggle", adapter.id, !adapter.enabled);
};
</script>

<template>
  <div class="flex h-full flex-col">
    <div class="flex-1 overflow-y-auto">
      <selector-bot v-model="formData" :is-edit="true" />
    </div>
    <div class="border-default flex justify-end gap-3 border-t px-4 py-3">
      <UButton
        color="error"
        variant="subtle"
        :disabled="loading"
        :loading="loading"
        @click="handleDelete"
      >
        删除
      </UButton>
      <UButton
        color="neutral"
        variant="subtle"
        :disabled="loading"
        @click="handleToggle"
      >
        {{ adapter.enabled ? "禁用" : "启用" }}
      </UButton>
      <UButton :disabled="loading" :loading="loading" @click="handleSave">
        保存
      </UButton>
    </div>
  </div>
</template>
