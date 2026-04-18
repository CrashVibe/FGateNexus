<script lang="ts" setup>
import type { z } from "zod";

import type { AdapterAPI } from "#shared/model/adapter";
import { AdapterType } from "#shared/model/adapter";

const modelValue = defineModel<
  Partial<z.infer<typeof AdapterAPI.POST.request>>
>({ required: true });

interface Props {
  isEdit?: boolean;
}

const { isEdit = false } = defineProps<Props>();

const selectedType = computed({
  get: () => modelValue.value.type,
  set: (value) => {
    modelValue.value.type = value;
    if (value === AdapterType.Onebot) {
      modelValue.value.config = {
        path: "",
        protocol: "ws-reverse",
        selfId: "",
      };
    }
  },
});

const protocolItems = [
  { label: "WebSocket 反向连接", value: "ws-reverse" },
  { label: "WebSocket 正向连接", value: "ws" },
];

const onProtocolChange = () => {
  if (modelValue.value.config?.protocol === "ws") {
    modelValue.value.config = {
      ...modelValue.value.config,
      retryInterval: 3e3,
      retryLazy: 1e3,
      retryTimes: 3,
      timeout: 5e3,
    };
  }
};
</script>

<template>
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
        :items="[{ label: 'OneBot', value: AdapterType.Onebot }]"
        class="w-full"
        placeholder="请选择适配器类型"
        :disabled="isEdit"
      />
    </UFormField>

    <template v-if="selectedType === AdapterType.Onebot && modelValue.config">
      <UFormField label="Bot ID" name="selfId">
        <UInput
          v-model="modelValue.config.selfId"
          class="w-full"
          placeholder="请输入机器人的账号"
        />
      </UFormField>

      <UFormField label="Token" name="token">
        <UInput
          v-model="modelValue.config.token"
          class="w-full"
          placeholder="发送信息时用于验证的字段"
        />
      </UFormField>

      <UFormField label="连接协议" name="protocol" class="md:col-span-2">
        <USelect
          v-model="modelValue.config.protocol"
          :items="protocolItems"
          class="w-full"
          placeholder="请选择连接协议"
          @update:model-value="onProtocolChange"
        />
      </UFormField>

      <template v-if="modelValue.config.protocol === 'ws-reverse'">
        <UFormField label="路径" name="path" class="md:col-span-2">
          <UInput
            v-model="modelValue.config.path"
            class="w-full"
            placeholder="如 /onebot"
          />
        </UFormField>
      </template>

      <template v-if="modelValue.config.protocol === 'ws'">
        <UFormField label="连接地址" name="endpoint" class="md:col-span-2">
          <UInput
            v-model="modelValue.config.endpoint"
            class="w-full"
            placeholder="ws://localhost:2333"
          />
        </UFormField>

        <UFormField label="超时时间（毫秒）" name="timeout">
          <UInputNumber
            v-model="modelValue.config.timeout"
            :min="1000"
            :step="1000"
            class="w-full"
            placeholder="5000"
          />
        </UFormField>

        <UFormField label="重试次数" name="retryTimes">
          <UInputNumber
            v-model="modelValue.config.retryTimes"
            :min="0"
            :step="1"
            class="w-full"
            placeholder="3"
          />
        </UFormField>

        <UFormField label="重试间隔（毫秒）" name="retryInterval">
          <UInputNumber
            v-model="modelValue.config.retryInterval"
            :min="1000"
            :step="100"
            class="w-full"
            placeholder="3000"
          />
        </UFormField>

        <UFormField label="重试延迟（毫秒）" name="retryLazy">
          <UInputNumber
            v-model="modelValue.config.retryLazy"
            :min="1000"
            :step="100"
            class="w-full"
            placeholder="1000"
          />
        </UFormField>
      </template>
    </template>
  </div>
</template>
