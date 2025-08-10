<script setup lang="ts">
import { AdapterType } from "#shared/schemas/adapters";
import type { AdapterWithStatus, BotInstanceData } from "#shared/schemas/adapters";
import { OneBotWSReverseConfigSchema, OneBotWSConfigSchema } from "#shared/schemas/adapters/onebot";
import type { FormInst } from "naive-ui";
import { createDynamicZodRules } from "#shared/validation";

const props = defineProps<{
  adapter: AdapterWithStatus;
}>();

const emit = defineEmits<{
  save: [data: BotInstanceData];
  delete: [adapterID: number];
}>();

const formRef = ref<FormInst>();
const loading = ref(false);

const formData = ref<BotInstanceData>({
  adapterType: props.adapter.type,
  config: props.adapter.config,
  adapterID: props.adapter.id
});

const selectedType = computed({
  get: () => formData.value.adapterType,
  set: (value) => {
    formData.value.adapterType = value;
    if (value === AdapterType.Onebot) {
      formData.value.config = {
        selfId: "",
        protocol: "ws-reverse",
        path: ""
      };
    }
  }
});

const protocolOptions = [
  { label: "WebSocket 反向连接", value: "ws-reverse" },
  { label: "WebSocket 正向连接", value: "ws" }
];

const wsConfig = ref({
  endpoint: "",
  timeout: 5000,
  retryTimes: 3,
  retryInterval: 3000,
  retryLazy: 1000
});

const currentSchema = computed(() => {
  if (formData.value.config?.protocol === "ws") {
    return OneBotWSConfigSchema;
  } else if (formData.value.config?.protocol === "ws-reverse") {
    return OneBotWSReverseConfigSchema;
  }
  return null;
});

const getRules = createDynamicZodRules(() => currentSchema.value);
const rules = computed(() => getRules());

const onProtocolChange = () => {
  if (formData.value.config?.protocol === "ws") {
    formData.value.config = {
      ...formData.value.config,
      ...wsConfig.value
    };
  }
};

const handleSave = async () => {
  try {
    await formRef.value?.validate();
    loading.value = true;
    emit("save", formData.value);
  } catch {
    // Validation failed
  } finally {
    loading.value = false;
  }
};

const handleDelete = () => {
  if (typeof formData.value.adapterID === "number") {
    emit("delete", formData.value.adapterID);
  }
};

onMounted(() => {
  if (formData.value.config?.protocol === "ws") {
    Object.assign(wsConfig.value, {
      endpoint: formData.value.config.endpoint || "",
      timeout: formData.value.config.timeout || 5000,
      retryTimes: formData.value.config.retryTimes || 3,
      retryInterval: formData.value.config.retryInterval || 3000,
      retryLazy: formData.value.config.retryLazy || 1000
    });
  }
});
</script>
<template>
  <n-drawer-content title="配置修改" closable>
    <div class="flex flex-col gap-6">
      <n-form
        ref="formRef"
        :model="formData.config || {}"
        :rules="rules"
        label-placement="top"
        require-mark-placement="left"
      >
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div class="md:col-span-2">
            <n-form-item label="适配器类型">
              <n-select :value="adapter.type" :options="[{ label: 'OneBot', value: AdapterType.Onebot }]" disabled />
            </n-form-item>
          </div>
          <template v-if="selectedType === AdapterType.Onebot && formData.config">
            <n-form-item label="Bot ID" path="selfId">
              <n-input v-model:value="formData.config.selfId" placeholder="请输入 Bot ID" />
            </n-form-item>
            <n-form-item label="连接协议" path="protocol">
              <n-select
                v-model:value="formData.config.protocol"
                :options="protocolOptions"
                placeholder="请选择连接协议"
                @update:value="onProtocolChange"
              />
            </n-form-item>
            <template v-if="formData.config.protocol === 'ws-reverse'">
              <n-form-item label="路径" path="path">
                <n-input v-model:value="formData.config.path" placeholder="请输入路径，如 /onebot" />
              </n-form-item>
            </template>
            <template v-if="formData.config.protocol === 'ws'">
              <n-form-item label="连接地址" path="endpoint">
                <n-input
                  v-model:value="wsConfig.endpoint"
                  placeholder="请输入 WebSocket 地址，如 ws://localhost:8080"
                />
              </n-form-item>
              <n-form-item label="超时时间(ms)" path="timeout">
                <n-input-number
                  v-model:value="wsConfig.timeout"
                  :min="1000"
                  :step="1000"
                  placeholder="5000"
                  class="w-full"
                />
              </n-form-item>
              <n-form-item label="重试次数" path="retryTimes">
                <n-input-number v-model:value="wsConfig.retryTimes" :min="0" :step="1" placeholder="3" class="w-full" />
              </n-form-item>
              <n-form-item label="重试间隔(ms)" path="retryInterval">
                <n-input-number
                  v-model:value="wsConfig.retryInterval"
                  :min="100"
                  :step="100"
                  placeholder="3000"
                  class="w-full"
                />
              </n-form-item>
              <n-form-item label="重试延迟(ms)" path="retryLazy">
                <n-input-number
                  v-model:value="wsConfig.retryLazy"
                  :min="0"
                  :step="100"
                  placeholder="1000"
                  class="w-full"
                />
              </n-form-item>
            </template>
          </template>
        </div>
      </n-form>
    </div>
    <template #footer>
      <div class="flex justify-end gap-3">
        <n-button type="error" ghost @click="handleDelete"> 删除 </n-button>
        <n-button type="primary" :loading="loading" @click="handleSave"> 保存 </n-button>
      </div>
    </template>
  </n-drawer-content>
</template>
