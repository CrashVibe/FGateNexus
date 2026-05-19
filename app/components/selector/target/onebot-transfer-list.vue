<template>
  <TransferList
    v-model:selected="selected"
    :items="items"
    :loading="loading"
    :error="errorMsg"
    @reload="retry"
  />
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";
import type { z } from "zod";

import { BotAPI } from "#shared/model/bot/api";
import { PlatformType } from "#shared/model/bot/types";
import { BotData } from "~/composables/api";

import TransferList from "./transfer-list.vue";
import type { TransferItem } from "./transfer-list.vue";

type OnebotChannelsData = z.infer<typeof BotAPI.ONEBOT_CHANNELS.response>;

const props = defineProps<{
  botId: number;
}>();

const emit = defineEmits<{
  loading: [boolean];
}>();

const toast = useToast();

const selected = defineModel<Set<string>>("selected", { required: true });

const loading = ref(false);
const errorMsg = ref<string | null>(null);
const channels = ref<OnebotChannelsData>([]);

const toSelectionKey = (channel: OnebotChannelsData[number]) =>
  `${channel.type}|${channel.type === "group" ? channel.id : ""}|${channel.id}`;

const items = computed<TransferItem[]>(() =>
  channels.value.map((channel) => ({
    avatar: channel.avatar ? { src: channel.avatar } : undefined,
    description: `${channel.type === "group" ? "群聊" : "私聊"} · ${channel.id}`,
    label: channel.name,
    value: toSelectionKey(channel),
  })),
);

const loadChannels = async () => {
  loading.value = true;
  errorMsg.value = null;

  try {
    const data = await BotData.getChannels(props.botId, PlatformType.Onebot);
    if (Array.isArray(data)) {
      channels.value = data;
    }
  } catch (error) {
    errorMsg.value =
      error instanceof Error ? error.message : "无法加载频道列表，请稍后重试";
    toast.add({
      color: "error",
      title: errorMsg.value,
    });
  } finally {
    loading.value = false;
  }
};

const retry = async () => {
  await loadChannels();
};

watch(
  () => loading.value,
  (value) => emit("loading", value),
  { immediate: true },
);

onMounted(async () => {
  await loadChannels();
});
</script>
