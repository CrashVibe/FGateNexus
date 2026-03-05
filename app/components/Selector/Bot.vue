<script lang="ts" setup>
import type { z } from "zod";

import { AdapterType } from "#shared/schemas/adapter";
import type { AdapterAPI } from "#shared/schemas/adapter";
import {
  OneBotWSConfigSchema,
  OneBotWSReverseConfigSchema,
} from "#shared/schemas/adapter/onebot";
import { createDynamicZodRules } from "~/composables/use-validation";

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

const protocolOptions = [
  { label: "WebSocket 反向连接", value: "ws-reverse" },
  { label: "WebSocket 正向连接", value: "ws" },
];

const currentSchema = computed(() => {
  if (modelValue.value.config?.protocol === "ws") {
    return OneBotWSConfigSchema;
  } else if (modelValue.value.config?.protocol === "ws-reverse") {
    return OneBotWSReverseConfigSchema;
  }
  return null;
});

const rules = computed(() =>
  createDynamicZodRules(() => currentSchema.value)(),
);

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
  <div class="flex flex-col gap-6">
    <n-form
      ref="formRef"
      :model="modelValue.config || {}"
      :rules="rules"
      label-placement="top"
      require-mark-placement="left"
    >
      <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div class="mb-2 md:col-span-2">
          <n-form-item label="Bot 实例名称" :show-feedback="false">
            <n-input
              v-model:value="modelValue.name"
              placeholder="请输入 Bot 实例名称"
              show-count
              maxlength="12"
            />
          </n-form-item>
        </div>
        <div class="mb-2 md:col-span-2">
          <n-form-item :show-feedback="false" label="适配器类型" required>
            <n-select
              v-model:value="selectedType"
              :options="[{ label: 'OneBot', value: AdapterType.Onebot }]"
              placeholder="请选择适配器类型"
              :disabled="isEdit"
            />
          </n-form-item>
        </div>

        <template
          v-if="selectedType === AdapterType.Onebot && modelValue.config"
        >
          <n-form-item label="Bot ID" path="selfId">
            <n-input
              v-model:value="modelValue.config.selfId"
              placeholder="请输入机器人的账号"
            />
          </n-form-item>

          <n-form-item label="Token" path="token">
            <n-input
              v-model:value="modelValue.config.token"
              placeholder="发送信息时用于验证的字段"
            />
          </n-form-item>

          <n-form-item label="连接协议" path="protocol">
            <n-select
              v-model:value="modelValue.config.protocol"
              :options="protocolOptions"
              placeholder="请选择连接协议"
              @update:value="onProtocolChange"
            />
          </n-form-item>

          <template v-if="modelValue.config.protocol === 'ws-reverse'">
            <n-form-item label="路径" path="path">
              <n-input
                v-model:value="modelValue.config.path"
                placeholder="如 /onebot"
              />
            </n-form-item>
          </template>

          <template v-if="modelValue.config.protocol === 'ws'">
            <n-form-item label="连接地址" path="endpoint">
              <n-input
                v-model:value="modelValue.config.endpoint"
                placeholder="ws://localhost:2333"
              />
            </n-form-item>

            <n-form-item label="超时时间" path="timeout">
              <n-input-number
                v-model:value="modelValue.config.timeout"
                :min="1000"
                :step="1000"
                class="w-full"
                placeholder="5000"
              >
                <template #suffix>毫秒</template>
              </n-input-number>
            </n-form-item>

            <n-form-item label="重试次数" path="retryTimes">
              <n-input-number
                v-model:value="modelValue.config.retryTimes"
                :min="0"
                :step="1"
                class="w-full"
                placeholder="3"
              />
            </n-form-item>

            <n-form-item label="重试间隔" path="retryInterval">
              <n-input-number
                v-model:value="modelValue.config.retryInterval"
                :min="1000"
                :step="100"
                class="w-full"
                placeholder="3000"
              >
                <template #suffix>毫秒</template>
              </n-input-number>
            </n-form-item>

            <n-form-item label="重试延迟" path="retryLazy">
              <n-input-number
                v-model:value="modelValue.config.retryLazy"
                :min="1000"
                :step="100"
                class="w-full"
                placeholder="1000"
              >
                <template #suffix>毫秒</template>
              </n-input-number>
            </n-form-item>
          </template>
        </template>
      </div>
    </n-form>
  </div>
</template>
