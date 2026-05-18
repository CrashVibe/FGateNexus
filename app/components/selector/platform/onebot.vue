<script lang="ts" setup>
import z from "zod";

import type {
  OneBotConfig,
  OneBotWSConfig,
  OneBotWSReverseConfig,
} from "#shared/model/bot/schema/onebot";
import {
  OneBotConfigSchema,
} from "#shared/model/bot/schema/onebot";

const modelValue = defineModel<OneBotConfig>({ required: true });

const formRef = useTemplateRef("formRef");

const protocolItems = [
  { label: "WebSocket 反向连接", value: "ws-reverse" },
  { label: "WebSocket 正向连接", value: "ws" },
];

const onebotWsConfig = computed(() =>
  modelValue.value.protocol === "ws" ? modelValue.value : null,
);

const onebotWsReverseConfig = computed(() =>
  modelValue.value.protocol === "ws-reverse" ? modelValue.value : null,
);

const buildWsConfig = (): OneBotWSConfig => ({
  endpoint: "",
  protocol: "ws",
  retryInterval: 3e3,
  retryLazy: 1e3,
  retryTimes: 3,
  selfId: modelValue.value.selfId ?? "",
  timeout: 5e3,
  token: modelValue.value.token ?? "",
});

const buildWsReverseConfig = (): OneBotWSReverseConfig => ({
  path: "",
  protocol: "ws-reverse",
  selfId: modelValue.value.selfId ?? "",
  token: modelValue.value.token ?? "",
});

const onProtocolChange = () => {
  if (modelValue.value.protocol === "ws") {
    const current = onebotWsConfig.value;
    modelValue.value = current
      ? { ...buildWsConfig(), ...current }
      : buildWsConfig();
    return;
  }

  if (modelValue.value.protocol === "ws-reverse") {
    const current = onebotWsReverseConfig.value;
    modelValue.value = current
      ? { ...buildWsReverseConfig(), ...current }
      : buildWsReverseConfig();
  }
};

const emit = defineEmits<{
  submit: [];
}>();

defineExpose({
  submit: () => formRef.value?.submit(),
});
</script>

<template>
  <UForm
    ref="formRef"
    :schema="OneBotConfigSchema"
    :state="modelValue"
    @submit="emit('submit')"
    class="grid grid-cols-1 gap-4 md:grid-cols-2"
  >
    <UFormField label="Bot ID" required name="selfId">
      <UInput
        v-model="modelValue.selfId"
        class="w-full"
        placeholder="请输入机器人的账号"
      />
    </UFormField>

    <UFormField label="Token" name="token">
      <UInput
        v-model="modelValue.token"
        class="w-full"
        placeholder="发送信息时用于验证的字段"
      />
    </UFormField>

    <UFormField label="连接协议" required name="protocol" class="md:col-span-2">
      <USelect
        v-model="modelValue.protocol"
        :items="protocolItems"
        class="w-full"
        placeholder="请选择连接协议"
        @update:model-value="onProtocolChange"
      />
    </UFormField>

    <template v-if="onebotWsReverseConfig">
      <UFormField label="路径" required name="path" class="md:col-span-2">
        <UInput
          v-model="onebotWsReverseConfig.path"
          class="w-full"
          placeholder="如 /onebot"
        />
      </UFormField>
    </template>

    <template v-if="onebotWsConfig">
      <UFormField
        label="连接地址"
        required
        name="endpoint"
        class="md:col-span-2"
      >
        <UInput
          v-model="onebotWsConfig.endpoint"
          class="w-full"
          placeholder="ws://localhost:2333"
        />
      </UFormField>

      <UFormField label="超时时间（毫秒）" required name="timeout">
        <UInputNumber
          v-model="onebotWsConfig.timeout"
          :min="1000"
          :step="1000"
          class="w-full"
          placeholder="5000"
        />
      </UFormField>

      <UFormField label="重试次数" required name="retryTimes">
        <UInputNumber
          v-model="onebotWsConfig.retryTimes"
          :min="0"
          :step="1"
          class="w-full"
          placeholder="3"
        />
      </UFormField>

      <UFormField label="重试间隔（毫秒）" required name="retryInterval">
        <UInputNumber
          v-model="onebotWsConfig.retryInterval"
          :min="1000"
          :step="100"
          class="w-full"
          placeholder="3000"
        />
      </UFormField>

      <UFormField label="重试延迟（毫秒）" required name="retryLazy">
        <UInputNumber
          v-model="onebotWsConfig.retryLazy"
          :min="1000"
          :step="100"
          class="w-full"
          placeholder="1000"
        />
      </UFormField>
    </template>
  </UForm>
</template>
