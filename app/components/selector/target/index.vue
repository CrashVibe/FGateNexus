<template>
  <div v-if="platform && botId">
    <OnebotTransferList
      v-if="platform === PlatformType.Onebot"
      :bot-id="botId"
      v-model:selected="selected"
      @loading="(v) => emit('loading', v)"
    />
    <DiscordTransferList
      v-else-if="platform === PlatformType.Discord"
      :bot-id="botId"
      v-model:selected="selected"
      @loading="(v) => emit('loading', v)"
    />
  </div>
</template>

<script setup lang="ts">
import { PlatformType } from "#shared/model/bot/types";

import DiscordTransferList from "./discord-transfer-list.vue";
import OnebotTransferList from "./onebot-transfer-list.vue";

defineProps<{
  botId: number;
  platform: PlatformType;
}>();

const emit = defineEmits<{
  loading: [boolean];
}>();

const selected = defineModel<Set<string>>("selected", { required: true });
</script>
