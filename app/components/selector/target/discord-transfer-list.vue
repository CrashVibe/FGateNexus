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

type DiscordChannelsData = z.infer<typeof BotAPI.DISCORD_CHANNELS.response>;

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
const data = ref<DiscordChannelsData>({
  channels: [],
  dms: [],
  guilds: [],
});

const guildNameMap = computed(
  () => new Map(data.value.guilds.map((guild) => [guild.id, guild.name])),
);

const toSelectionKey = (
  type: "group" | "private",
  channelId: string,
  guildId?: string,
) => `${type}|${guildId ?? ""}|${channelId}`;

const channelItems = computed<TransferItem[]>(() =>
  data.value.channels.map((channel) => ({
    avatar: channel.avatar ? { src: channel.avatar } : undefined,
    description: `${guildNameMap.value.get(channel.guildId ?? "") ?? channel.guildId ?? "未知服务器"} · ${channel.id}`,
    label: channel.name,
    value: toSelectionKey("group", channel.id, channel.guildId),
  })),
);

const dmItems = computed<TransferItem[]>(() =>
  data.value.dms.map((dm) => ({
    avatar: dm.avatar ? { src: dm.avatar } : undefined,
    description: `私聊 · ${dm.id}`,
    label: dm.name,
    value: toSelectionKey("private", dm.id),
  })),
);

const items = computed<TransferItem[]>(() => [
  ...channelItems.value,
  ...dmItems.value,
]);

const loadChannels = async (skipCache = false) => {
  loading.value = true;
  errorMsg.value = null;
  try {
    const channels = (await BotData.getChannels(
      props.botId,
      PlatformType.Discord,
    )) as DiscordChannelsData;
    data.value = channels;
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
  await loadChannels(true);
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
