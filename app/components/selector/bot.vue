<script lang="ts" setup>
import type { z } from "zod";
import { PlatformType } from "~~/shared/model/bot/types";

import type { BotAPI } from "#shared/model/bot/api";
import type { DiscordConfig } from "#shared/model/bot/schema/discord";
import type { OneBotConfig } from "#shared/model/bot/schema/onebot";

import SelectorBotDiscord from "./platform/discord.vue";
import SelectorBotOnebot from "./platform/onebot.vue";

const modelValue = defineModel<Partial<z.infer<typeof BotAPI.POST.request>>>({
  required: true,
});

interface Props {
  isEdit?: boolean;
}

const props = defineProps<Props>();
const isEdit = computed(() => props.isEdit ?? false);

const innerFormRef =
  useTemplateRef<
    InstanceType<typeof SelectorBotDiscord | typeof SelectorBotOnebot>
  >("innerFormRef");

const buildDefaultConfig = (type?: PlatformType) => {
  if (type === PlatformType.Onebot) {
    return {
      path: "",
      protocol: "ws-reverse",
      selfId: "",
      token: "",
    } as const;
  }

  if (type === PlatformType.Discord) {
    return { token: "" } as const;
  }
};

const selectedType = computed({
  get: () => modelValue.value.platform,
  set: (value) => {
    modelValue.value.platform = value;
    modelValue.value.config = buildDefaultConfig(value);
  },
});

const onebotConfig = computed<OneBotConfig | null>({
  get: () =>
    selectedType.value === PlatformType.Onebot
      ? ((modelValue.value.config ?? null) as OneBotConfig | null)
      : null,
  set: (value) => {
    modelValue.value.config = value ?? undefined;
  },
});

const discordConfig = computed<DiscordConfig | null>({
  get: () =>
    selectedType.value === PlatformType.Discord
      ? ((modelValue.value.config ?? null) as DiscordConfig | null)
      : null,
  set: (value) => {
    modelValue.value.config = value ?? undefined;
  },
});

const emit = defineEmits<{ submit: [] }>();

defineExpose({
  submit: () => innerFormRef.value?.submit(),
});
</script>

<template>
  <div class="flex flex-col gap-4">
    <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
      <UFormField label="Bot 实例名称" class="md:col-span-2">
        <UInput
          v-model="modelValue.name"
          class="w-full"
          placeholder="请输入 Bot 实例名称"
          :maxlength="12"
        />
      </UFormField>

      <UFormField label="适配器类型" required class="md:col-span-2">
        <USelect
          v-model="selectedType"
          :items="[
            { label: 'OneBot', value: PlatformType.Onebot },
            { label: 'Discord', value: PlatformType.Discord },
          ]"
          class="w-full"
          placeholder="请选择适配器类型"
          :disabled="isEdit"
        />
      </UFormField>
    </div>

    <template v-if="selectedType === PlatformType.Discord && discordConfig">
      <SelectorBotDiscord
        v-model="discordConfig"
        ref="innerFormRef"
        @submit="emit('submit')"
      />
    </template>

    <template v-if="selectedType === PlatformType.Onebot && onebotConfig">
      <SelectorBotOnebot
        v-model="onebotConfig"
        ref="innerFormRef"
        @submit="emit('submit')"
      />
    </template>
  </div>
</template>
