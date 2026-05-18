<script lang="ts" setup>
import type { z } from "zod";

import type { BotWithStatus, BotAPI } from "#shared/model/bot/api";
import SelectorBot from "@/components/selector/bot.vue";

const { bot } = defineProps<{
  bot: BotWithStatus;
}>();

const emit = defineEmits<{
  save: [botID: number, data: z.infer<typeof BotAPI.POST.request>];
  delete: [botID: number];
  toggle: [botID: number, enabled: boolean];
}>();

const formData = ref<z.infer<typeof BotAPI.POST.request>>({
  config: bot.config,
  name: bot.name,
  platform: bot.platform,
});

const formRef = useTemplateRef<InstanceType<typeof SelectorBot>>("formRef");

const handleDelete = () => {
  emit("delete", bot.id);
};

const handleToggle = () => emit("toggle", bot.id, !bot.enabled);
</script>

<template>
  <div class="flex h-full flex-col">
    <div class="flex-1 overflow-y-auto">
      <SelectorBot
        ref="formRef"
        @submit="emit('save', bot.id, formData)"
        v-model="formData"
        :is-edit="true"
      />
    </div>
    <div class="border-default flex justify-end gap-3 border-t px-4 py-3">
      <UButton color="error" variant="subtle" @click="handleDelete">
        删除
      </UButton>
      <UButton color="neutral" variant="subtle" @click="handleToggle">
        {{ bot.enabled ? "禁用" : "启用" }}
      </UButton>
      <UButton @click="formRef?.submit()"> 保存 </UButton>
    </div>
  </div>
</template>
