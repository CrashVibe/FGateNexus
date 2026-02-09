<template>
  <div>
    <HeaderServer class="mb-3" />
    <n-form ref="formRef" :model="formData.config" :rules="rules">
      <n-grid :x-gap="12" :y-gap="12" :cols="isMobile ? 1 : '2'">
        <n-grid-item>
          <n-card class="h-fit" size="small" title="基础设置">
            <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
              <n-form-item label="绑定数量" path="maxBindCount">
                <n-input-number
                  v-model:value="formData.config.maxBindCount"
                  class="w-full"
                  placeholder="请输入最大绑定数量"
                />
              </n-form-item>

              <n-form-item label="验证码长度" path="codeLength">
                <n-input-number
                  v-model:value="formData.config.codeLength"
                  class="w-full"
                  placeholder="生成的验证码字符数量，影响验证码复杂度"
                />
              </n-form-item>

              <n-form-item label="验证码模式" path="codeMode">
                <n-select
                  v-model:value="formData.config.codeMode"
                  :options="codeModeOptions"
                  class="w-full"
                  placeholder="请选择验证码生成模式"
                />
              </n-form-item>

              <n-form-item label="验证码过期时间" path="codeExpire">
                <n-input-number
                  v-model:value="formData.config.codeExpire"
                  :min="1"
                  :step="1"
                  class="w-full"
                  placeholder="验证码过期时间（分钟）"
                >
                  <template #suffix>分钟</template>
                </n-input-number>
              </n-form-item>
            </div>
            <n-form-item label="绑定前缀" path="prefix">
              <n-input
                v-model:value="formData.config.prefix"
                :maxlength="50"
                class="w-full"
                placeholder="如：/绑定 ，用于绑定账号的指令前缀"
                show-count
              />
            </n-form-item>
            <n-form-item label="解绑前缀" path="unbindPrefix">
              <n-input
                v-model:value="formData.config.unbindPrefix"
                :maxlength="50"
                :placeholder="`如：/解绑 ，用于解绑账号的专用指令前缀，留空则用绑定前缀+玩家名`"
                class="w-full"
                show-count
              />
            </n-form-item>
            <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
              <n-form-item label="允许解绑" :show-feedback="false" path="allowUnbind">
                <n-switch v-model:value="formData.config.allowUnbind" />
              </n-form-item>
              <n-form-item label="离群自动解绑" :show-feedback="false" path="allowGroupUnbind">
                <n-switch v-model:value="formData.config.allowGroupUnbind" />
              </n-form-item>
            </div>
            <n-divider title-placement="left">指令示例预览</n-divider>
            <div class="mb-2">
              <n-text class="mb-2" round type="success">
                <h1>绑定指令</h1>
                <p class="text-gray-500">用户在社交平台聊天中发送此指令来绑定游戏账号</p>
              </n-text>
              <div class="mb-2 p-2">
                <n-code :code="bindCommandExample" language="text" />
              </div>
            </div>
            <n-collapse-transition :show="formData.config.allowUnbind">
              <n-text class="mb-2" round type="warning">
                <h1>解绑指令</h1>
                <p class="text-gray-500">使用专用解绑前缀进行解绑操作，直接输入玩家名称即可</p>
              </n-text>
              <div class="mb-2 p-2">
                <n-code :code="unbindCommandExample" language="text" />
              </div>
            </n-collapse-transition>
          </n-card>
        </n-grid-item>
        <n-grid-item>
          <n-card class="h-full" size="small" title="反馈消息配置">
            <n-form-item class="mb-2" label="绑定成功" path="bindSuccessMsg">
              <n-input
                v-model:value="formData.config.bindSuccessMsg"
                maxlength="200"
                placeholder="绑定成功时的反馈消息"
                show-count
              />
              <template #feedback>
                <div class="mt-2 space-y-2">
                  <div class="flex flex-wrap gap-1">
                    <n-tooltip v-for="tag in bindSuccessVariables" :key="tag.value" trigger="hover">
                      <template #trigger>
                        <n-tag
                          :type="formData.config.bindSuccessMsg.includes(tag.value) ? 'primary' : 'default'"
                          class="cursor-pointer"
                          size="small"
                          @click="insertPlaceholder('bindSuccessMsg', tag.value)"
                        >
                          {{ tag.value }}
                        </n-tag>
                      </template>
                      {{ tag.label }} · [{{ tag.example }}]
                    </n-tooltip>
                  </div>
                  <div class="text-sm text-gray-500">
                    预览：
                    <n-text type="success">
                      {{ renderBindSuccess(formData.config.bindSuccessMsg, "Steve") }}
                    </n-text>
                  </div>
                </div>
              </template>
            </n-form-item>

            <n-form-item class="mb-2" label="绑定失败" path="bindFailMsg">
              <n-input
                v-model:value="formData.config.bindFailMsg"
                maxlength="200"
                placeholder="绑定失败时的反馈消息"
                show-count
              />
              <template #feedback>
                <div class="mt-2 space-y-2">
                  <div class="flex flex-wrap gap-1">
                    <n-tooltip v-for="tag in bindFailVariables" :key="tag.value" trigger="hover">
                      <template #trigger>
                        <n-tag
                          :type="formData.config.bindFailMsg.includes(tag.value) ? 'primary' : 'default'"
                          class="cursor-pointer"
                          size="small"
                          @click="insertPlaceholder('bindFailMsg', tag.value)"
                        >
                          {{ tag.value }}
                        </n-tag>
                      </template>
                      {{ tag.label }} · [{{ tag.example }}]
                    </n-tooltip>
                  </div>
                  <div class="text-sm text-gray-500">
                    预览：
                    <n-text type="error">
                      {{ renderBindFail(formData.config.bindFailMsg, "Steve", "因为某种奇妙の原因") }}
                    </n-text>
                  </div>
                </div>
              </template>
            </n-form-item>

            <n-form-item class="mb-2" label="解绑成功" path="unbindSuccessMsg">
              <n-input
                v-model:value="formData.config.unbindSuccessMsg"
                maxlength="200"
                placeholder="解绑成功时的反馈消息，支持#user占位符"
                show-count
              />
              <template #feedback>
                <div class="mt-2 space-y-2">
                  <div class="flex flex-wrap gap-1">
                    <n-tooltip v-for="tag in unbindSuccessVariables" :key="tag.value" trigger="hover">
                      <template #trigger>
                        <n-tag
                          :type="formData.config.unbindSuccessMsg.includes(tag.value) ? 'primary' : 'default'"
                          class="cursor-pointer"
                          size="small"
                          @click="insertPlaceholder('unbindSuccessMsg', tag.value)"
                        >
                          {{ tag.value }}
                        </n-tag>
                      </template>
                      {{ tag.label }} · [{{ tag.example }}]
                    </n-tooltip>
                  </div>
                  <div class="text-sm text-gray-500">
                    预览：
                    <n-text type="success">
                      {{ renderUnbindSuccess(formData.config.unbindSuccessMsg, "Steve") }}
                    </n-text>
                  </div>
                </div>
              </template>
            </n-form-item>

            <n-form-item class="mb-2" label="解绑失败" path="unbindFailMsg">
              <n-input
                v-model:value="formData.config.unbindFailMsg"
                maxlength="200"
                placeholder="解绑失败时的反馈消息"
                show-count
              />
              <template #feedback>
                <div class="mt-2 space-y-2">
                  <div class="flex flex-wrap gap-1">
                    <n-tooltip v-for="tag in unbindFailVariables" :key="tag.value" trigger="hover">
                      <template #trigger>
                        <n-tag
                          :type="formData.config.unbindFailMsg.includes(tag.value) ? 'primary' : 'default'"
                          class="cursor-pointer"
                          size="small"
                          @click="insertPlaceholder('unbindFailMsg', tag.value)"
                        >
                          {{ tag.value }}
                        </n-tag>
                      </template>
                      {{ tag.label }} · [{{ tag.example }}]
                    </n-tooltip>
                  </div>
                  <div class="text-sm text-gray-500">
                    预览：
                    <n-text type="error">
                      {{ renderUnbindFail(formData.config.unbindFailMsg, "Steve", "因为某种奇妙の原因") }}
                    </n-text>
                  </div>
                </div>
              </template>
            </n-form-item>
          </n-card>
        </n-grid-item>
        <n-grid-item>
          <n-card class="h-fit" size="small" title="绑定提示">
            <n-form-item label="强制绑定" path="forceBind">
              <n-switch v-model:value="formData.config.forceBind" />
            </n-form-item>

            <n-form-item class="mb-2" label="未绑定踢出消息" path="nobindkickMsg">
              <n-input
                v-model:value="formData.config.nobindkickMsg"
                :rows="3"
                maxlength="500"
                placeholder="当玩家未绑定社交账号时显示的踢出消息，支持颜色代码"
                show-count
                type="textarea"
              />
              <template #feedback>
                <div class="mt-2 space-y-2">
                  <div class="flex flex-wrap gap-1">
                    <n-tooltip v-for="tag in noBindKickVariables" :key="tag.value" trigger="hover">
                      <template #trigger>
                        <n-tag
                          :type="formData.config.nobindkickMsg.includes(tag.value) ? 'primary' : 'default'"
                          class="cursor-pointer"
                          size="small"
                          @click="insertPlaceholder('nobindkickMsg', tag.value)"
                        >
                          {{ tag.value }}
                        </n-tag>
                      </template>
                      {{ tag.label }} · [{{ tag.example }}]
                    </n-tooltip>
                  </div>
                  <div class="text-sm text-gray-500">
                    预览：
                    <n-text>
                      <span v-html="noBindKickMsgPreview"></span>
                    </n-text>
                  </div>
                </div>
              </template>
            </n-form-item>

            <n-form-item class="mb-2" label="解绑踢出消息" path="unbindkickMsg">
              <n-input
                v-model:value="formData.config.unbindkickMsg"
                :rows="2"
                maxlength="500"
                placeholder="当玩家的社交账号被解绑时显示的踢出消息"
                show-count
                type="textarea"
              />
              <template #feedback>
                <div class="mt-2 space-y-2">
                  <div class="flex flex-wrap gap-1">
                    <n-tooltip v-for="tag in unbindKickVariables" :key="tag.value" trigger="hover">
                      <template #trigger>
                        <n-tag
                          :type="formData.config.unbindkickMsg.includes(tag.value) ? 'primary' : 'default'"
                          class="cursor-pointer"
                          size="small"
                          @click="insertPlaceholder('unbindkickMsg', tag.value)"
                        >
                          {{ tag.value }}
                        </n-tag>
                      </template>
                      {{ tag.label }} · [{{ tag.example }}]
                    </n-tooltip>
                  </div>
                  <div class="text-sm text-gray-500">
                    预览：
                    <n-text>
                      <span v-html="unbindKickMsgPreview"></span>
                    </n-text>
                  </div>
                </div>
              </template>
            </n-form-item>
          </n-card>
        </n-grid-item>
      </n-grid>
    </n-form>
    <n-divider />
    <div class="flex justify-end gap-2">
      <n-button :disabled="isAnyLoading || !isDirty" :loading="isAnyLoading" @click="cancelChanges">取消</n-button>
      <n-button :disabled="isAnyLoading || !isDirty" :loading="isAnyLoading" ghost type="primary" @click="handleSubmit">
        <template #icon>
          <n-icon>
            <svg viewBox="0 0 24 24">
              <path
                d="M17 3H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V7l-4-4zm2 16H5V5h11.17L19 7.83V19zm-7-7c-1.66 0-3 1.34-3 3s1.34 3 3 3s3-1.34 3-3s-1.34-3-3-3zM6 6h9v4H6z"
                fill="currentColor"
              />
            </svg>
          </n-icon>
        </template>
        保存设置
      </n-button>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { isMobile } from "#imports";
import moment from "moment-timezone";
import type { FormInst } from "naive-ui";
import type z from "zod";
import { cloneDeep, isEqual } from "lodash-es";
import { BindingData, ServerData } from "~/composables/api";
import { type BindingConfig, BindingConfigSchema, CODE_MODES } from "~~/shared/schemas/server/binding";
import type { ServersAPI } from "~~/shared/schemas/server/servers";
import {
  renderBindFail,
  renderBindSuccess,
  renderNoBindKick,
  renderUnbindFail,
  renderUnbindKick,
  renderUnbindSuccess
} from "~~/shared/utils/template/binding";
import { createVariablesArray } from "~/composables/usePlaceholderVariables";

const { setPageState, clearPageState } = usePageStateStore();
const { minecraftToHtml, initObfuscatedAnimation, stopObfuscatedAnimation } = useMinecraftFormat();

definePageMeta({ layout: "server-edit" });

const route = useRoute();
const message = useMessage();
const formRef = ref<FormInst>();

interface FormState {
  config: BindingConfig;
}

const formData = reactive<FormState>({
  config: BindingConfigSchema.parse({})
});

let serverData: z.infer<typeof ServersAPI.GET.response> | null = null;

const originalFormData = ref<FormState | null>(null);

const loadingMap = reactive({
  isLoading: true,
  isSubmitting: false
});

const isDirty = computed(() => !isEqual(formData, originalFormData.value));
const isAnyLoading = computed(() => Object.values(loadingMap).some(Boolean));

const rules = zodToNaiveRules(BindingConfigSchema);
const codeModeOptions = [
  { label: "纯数字", value: CODE_MODES.NUMBER },
  { label: "纯单词 (小写)", value: CODE_MODES.LOWER },
  { label: "纯单词 (大写)", value: CODE_MODES.UPPER },
  { label: "纯单词 (大小写)", value: CODE_MODES.WORD },
  { label: "大小写单词和数字", value: CODE_MODES.MIX }
];

const bindCommandExample = computed(() => {
  return formData.config.prefix + generateVerificationCode(formData.config.codeMode, formData.config.codeLength);
});

const unbindCommandExample = computed(() => {
  return formData.config.unbindPrefix + "Steve";
});

const bindExpireTimeExample = computed(() => {
  const expireTime = formData.config.codeExpire;
  return moment().add(expireTime, "minutes").format("YYYY-MM-DD HH:mm:ss");
});

const noBindKickMsgPreview = computed(() => {
  const replaced = renderNoBindKick(
    formData.config.nobindkickMsg,
    "Steve",
    bindCommandExample.value,
    bindExpireTimeExample.value
  );
  return minecraftToHtml(replaced);
});

const unbindKickMsgPreview = computed(() => {
  const replaced = renderUnbindKick(formData.config.unbindkickMsg, "114514");
  return minecraftToHtml(replaced);
});

const noBindKickVariables = computed(() =>
  createVariablesArray({
    "{name}": { label: "玩家名", example: "Steve" },
    "{message}": { label: "消息", example: bindCommandExample.value },
    "{time}": { label: "过期时间", example: bindExpireTimeExample.value }
  })
);

const unbindKickVariables = computed(() =>
  createVariablesArray({
    "{social_account}": { label: "社交账号", example: "114514" }
  })
);

const bindSuccessVariables = computed(() =>
  createVariablesArray({
    "{user}": { label: "玩家名", example: "Steve" }
  })
);

const bindFailVariables = computed(() =>
  createVariablesArray({
    "{user}": { label: "玩家名", example: "Steve" },
    "{why}": { label: "原因", example: "因为某种奇妙の原因" }
  })
);

const unbindSuccessVariables = computed(() =>
  createVariablesArray({
    "{user}": { label: "玩家名", example: "Steve" }
  })
);

const unbindFailVariables = computed(() =>
  createVariablesArray({
    "{user}": { label: "玩家名", example: "Steve" },
    "{why}": { label: "原因", example: "因为某种奇妙の原因" }
  })
);

function insertPlaceholder(
  field: keyof Pick<
    BindingConfig,
    "nobindkickMsg" | "unbindkickMsg" | "bindSuccessMsg" | "bindFailMsg" | "unbindSuccessMsg" | "unbindFailMsg"
  >,
  placeholder: string
) {
  const current = formData.config[field] || "";
  formData.config[field] = current + placeholder;
}

async function refreshServerData(): Promise<void> {
  if (!route.params["id"]) return;
  loadingMap.isLoading = true;
  try {
    const data = await ServerData.get(Number(route.params["id"]));
    serverData = data;
    formData.config = cloneDeep(data.bindingConfig || BindingConfigSchema.parse({}));
    originalFormData.value = cloneDeep(formData);
  } catch (error) {
    console.error("Failed to refresh server data:", error);
    message.error("刷新服务器数据失败");
  } finally {
    loadingMap.isLoading = false;
  }
}

async function handleSubmit() {
  if (!isDirty.value) {
    message.info("没有需要保存的更改");
    return;
  }

  try {
    await formRef.value?.validate();
  } catch {
    return;
  }

  loadingMap.isSubmitting = true;
  try {
    await BindingData.patch(serverData?.id ?? Number(route.params["id"]), { config: formData.config });
    message.success("绑定配置已保存");
    await refreshServerData();
  } catch (error) {
    console.error("Submit failed:", error);
    message.error("保存配置失败，请稍后再试");
  } finally {
    loadingMap.isSubmitting = false;
  }
}

function cancelChanges() {
  if (originalFormData.value) {
    formData.config = cloneDeep(originalFormData.value.config);
  } else {
    formData.config = BindingConfigSchema.parse({});
  }
}

onMounted(async () => {
  await refreshServerData();
  initObfuscatedAnimation();
  setPageState({ isDirty: () => isDirty.value, save: handleSubmit });
});

onUnmounted(() => {
  stopObfuscatedAnimation();
  clearPageState();
});

watch(
  () => [formData.config.nobindkickMsg, formData.config.unbindkickMsg],
  () => {
    nextTick(() => {
      initObfuscatedAnimation();
    });
  }
);
</script>
