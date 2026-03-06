<template>
  <div class="h-full">
    <UDashboardPanel
      class="scrollbar-custom h-full"
      :ui="{ body: 'p-0 sm:p-0 overflow-y-auto overscroll-none' }"
    >
      <template #header>
        <ServerHeader />
      </template>
      <template #body>
        <UContainer class="py-8">
          <UForm
            ref="form"
            :schema="BindingConfigSchema"
            :state="formData.config"
            @submit="onFormSubmit"
          >
            <div
              class="grid gap-4"
              :class="isMobile ? 'grid-cols-1' : 'grid-cols-2'"
            >
              <!-- 基础设置 -->
              <UPageCard variant="outline">
                <template #title>基础设置</template>
                <template #description>
                  <span class="text-muted text-sm">配置绑定功能的基本参数</span>
                </template>
                <template #footer>
                  <div class="flex flex-col gap-4">
                    <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <UFormField name="maxBindCount" label="绑定数量">
                        <UInputNumber
                          v-model="formData.config.maxBindCount"
                          class="w-full"
                          placeholder="最大绑定数量"
                        />
                      </UFormField>
                      <UFormField name="codeLength" label="验证码长度">
                        <UInputNumber
                          v-model="formData.config.codeLength"
                          class="w-full"
                          placeholder="生成的验证码字符数量"
                        />
                      </UFormField>
                      <UFormField name="codeMode" label="验证码模式">
                        <USelect
                          v-model="formData.config.codeMode"
                          :items="codeModeOptions"
                          class="w-full"
                          placeholder="请选择验证码生成模式"
                        />
                      </UFormField>
                      <UFormField
                        name="codeExpire"
                        label="验证码过期时间（分钟）"
                      >
                        <UInputNumber
                          v-model="formData.config.codeExpire"
                          :min="1"
                          class="w-full"
                          placeholder="验证码过期时间"
                        />
                      </UFormField>
                    </div>
                    <UFormField name="prefix" label="绑定前缀">
                      <UInput
                        v-model="formData.config.prefix"
                        :maxlength="50"
                        class="w-full"
                        placeholder="如：/绑定 ，用于绑定账号的指令前缀"
                      />
                    </UFormField>
                    <UFormField name="unbindPrefix" label="解绑前缀">
                      <UInput
                        v-model="formData.config.unbindPrefix"
                        :maxlength="50"
                        class="w-full"
                        :placeholder="`如：/解绑 ，用于解绑账号的专用指令前缀，留空则用绑定前缀+玩家名`"
                      />
                    </UFormField>
                    <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <UFormField name="allowUnbind" label="允许解绑">
                        <USwitch v-model="formData.config.allowUnbind" />
                      </UFormField>
                      <UFormField name="allowGroupUnbind" label="离群自动解绑">
                        <USwitch v-model="formData.config.allowGroupUnbind" />
                      </UFormField>
                    </div>
                    <USeparator label="指令示例预览" />
                    <div>
                      <p class="text-success mb-1 font-medium">绑定指令</p>
                      <p class="text-muted mb-2 text-sm">
                        用户在社交平台聊天中发送此指令来绑定游戏账号
                      </p>
                      <code
                        class="bg-elevated block rounded p-2 font-mono text-sm"
                      >
                        {{ bindCommandExample }}
                      </code>
                    </div>
                    <div v-show="formData.config.allowUnbind">
                      <p class="text-warning mb-1 font-medium">解绑指令</p>
                      <p class="text-muted mb-2 text-sm">
                        使用专用解绑前缀进行解绑操作，直接输入玩家名称即可
                      </p>
                      <code
                        class="bg-elevated block rounded p-2 font-mono text-sm"
                      >
                        {{ unbindCommandExample }}
                      </code>
                    </div>
                  </div>
                </template>
              </UPageCard>
              <!-- 反馈消息配置 -->
              <UPageCard variant="outline">
                <template #title>反馈消息配置</template>
                <template #description>
                  <span class="text-muted text-sm"
                    >配置绑定/解绑操作的反馈消息内容</span
                  >
                </template>
                <template #footer>
                  <div class="flex flex-col gap-4">
                    <!-- 绑定成功 -->
                    <UFormField name="bindSuccessMsg" label="绑定成功">
                      <UInput
                        v-model="formData.config.bindSuccessMsg"
                        :maxlength="200"
                        class="w-full"
                        placeholder="绑定成功时的反馈消息"
                      />
                      <div class="mt-2 space-y-2">
                        <p class="text-muted text-xs">点击变量插入到消息</p>
                        <div class="flex flex-wrap gap-1">
                          <UTooltip
                            v-for="tag in bindSuccessVariables"
                            :key="tag.value"
                            :text="`${tag.label} · [${tag.example}]`"
                          >
                            <UBadge
                              :color="
                                formData.config.bindSuccessMsg.includes(
                                  tag.value,
                                )
                                  ? 'primary'
                                  : 'neutral'
                              "
                              variant="subtle"
                              class="cursor-pointer"
                              @click="
                                insertPlaceholder('bindSuccessMsg', tag.value)
                              "
                            >
                              {{ tag.value }}
                            </UBadge>
                          </UTooltip>
                        </div>
                        <div class="text-muted text-sm">
                          预览：
                          <span class="text-success">
                            {{
                              renderBindSuccess(
                                formData.config.bindSuccessMsg,
                                "Steve",
                              )
                            }}
                          </span>
                        </div>
                      </div>
                    </UFormField>

                    <!-- 绑定失败 -->
                    <UFormField name="bindFailMsg" label="绑定失败">
                      <UInput
                        v-model="formData.config.bindFailMsg"
                        :maxlength="200"
                        class="w-full"
                        placeholder="绑定失败时的反馈消息"
                      />
                      <div class="mt-2 space-y-2">
                        <p class="text-muted text-xs">点击变量插入到消息</p>
                        <div class="flex flex-wrap gap-1">
                          <UTooltip
                            v-for="tag in bindFailVariables"
                            :key="tag.value"
                            :text="`${tag.label} · [${tag.example}]`"
                          >
                            <UBadge
                              :color="
                                formData.config.bindFailMsg.includes(tag.value)
                                  ? 'primary'
                                  : 'neutral'
                              "
                              variant="subtle"
                              class="cursor-pointer"
                              @click="
                                insertPlaceholder('bindFailMsg', tag.value)
                              "
                            >
                              {{ tag.value }}
                            </UBadge>
                          </UTooltip>
                        </div>
                        <div class="text-muted text-sm">
                          预览：
                          <span class="text-error">
                            {{
                              renderBindFail(
                                formData.config.bindFailMsg,
                                "Steve",
                                "因为某种奇妙の原因",
                              )
                            }}
                          </span>
                        </div>
                      </div>
                    </UFormField>

                    <!-- 解绑成功 -->
                    <UFormField name="unbindSuccessMsg" label="解绑成功">
                      <UInput
                        v-model="formData.config.unbindSuccessMsg"
                        :maxlength="200"
                        class="w-full"
                        placeholder="解绑成功时的反馈消息，支持 #user 占位符"
                      />
                      <div class="mt-2 space-y-2">
                        <p class="text-muted text-xs">点击变量插入到消息</p>
                        <div class="flex flex-wrap gap-1">
                          <UTooltip
                            v-for="tag in unbindSuccessVariables"
                            :key="tag.value"
                            :text="`${tag.label} · [${tag.example}]`"
                          >
                            <UBadge
                              :color="
                                formData.config.unbindSuccessMsg.includes(
                                  tag.value,
                                )
                                  ? 'primary'
                                  : 'neutral'
                              "
                              variant="subtle"
                              class="cursor-pointer"
                              @click="
                                insertPlaceholder('unbindSuccessMsg', tag.value)
                              "
                            >
                              {{ tag.value }}
                            </UBadge>
                          </UTooltip>
                        </div>
                        <div class="text-muted text-sm">
                          预览：
                          <span class="text-success">
                            {{
                              renderUnbindSuccess(
                                formData.config.unbindSuccessMsg,
                                "Steve",
                              )
                            }}
                          </span>
                        </div>
                      </div>
                    </UFormField>

                    <!-- 解绑失败 -->
                    <UFormField name="unbindFailMsg" label="解绑失败">
                      <UInput
                        v-model="formData.config.unbindFailMsg"
                        :maxlength="200"
                        class="w-full"
                        placeholder="解绑失败时的反馈消息"
                      />
                      <div class="mt-2 space-y-2">
                        <p class="text-muted text-xs">点击变量插入到消息</p>
                        <div class="flex flex-wrap gap-1">
                          <UTooltip
                            v-for="tag in unbindFailVariables"
                            :key="tag.value"
                            :text="`${tag.label} · [${tag.example}]`"
                          >
                            <UBadge
                              :color="
                                formData.config.unbindFailMsg.includes(
                                  tag.value,
                                )
                                  ? 'primary'
                                  : 'neutral'
                              "
                              variant="subtle"
                              class="cursor-pointer"
                              @click="
                                insertPlaceholder('unbindFailMsg', tag.value)
                              "
                            >
                              {{ tag.value }}
                            </UBadge>
                          </UTooltip>
                        </div>
                        <div class="text-muted text-sm">
                          预览：
                          <span class="text-error">
                            {{
                              renderUnbindFail(
                                formData.config.unbindFailMsg,
                                "Steve",
                                "因为某种奇妙の原因",
                              )
                            }}
                          </span>
                        </div>
                      </div>
                    </UFormField>
                  </div>
                </template>
              </UPageCard>

              <!-- 绑定提示 -->
              <UPageCard variant="outline">
                <template #title>绑定提示</template>
                <template #description>
                  <span class="text-muted text-sm">配置强制绑定及踢出消息</span>
                </template>
                <template #footer>
                  <div class="flex flex-col gap-4">
                    <UFormField name="forceBind" label="强制绑定">
                      <USwitch v-model="formData.config.forceBind" />
                    </UFormField>

                    <!-- 未绑定踢出消息 -->
                    <UFormField
                      name="nobindkickMsg"
                      label="未绑定踢出消息"
                      description="当玩家未绑定社交账号时显示的踢出消息，支持颜色代码"
                    >
                      <UTextarea
                        v-model="formData.config.nobindkickMsg"
                        :rows="3"
                        :maxlength="500"
                        class="w-full"
                        placeholder="当玩家未绑定社交账号时显示的踢出消息"
                      />
                      <div class="mt-2 space-y-2">
                        <p class="text-muted text-xs">点击变量插入到消息</p>
                        <div class="flex flex-wrap gap-1">
                          <UTooltip
                            v-for="tag in noBindKickVariables"
                            :key="tag.value"
                            :text="`${tag.label} · [${tag.example}]`"
                          >
                            <UBadge
                              :color="
                                formData.config.nobindkickMsg.includes(
                                  tag.value,
                                )
                                  ? 'primary'
                                  : 'neutral'
                              "
                              variant="subtle"
                              class="cursor-pointer"
                              @click="
                                insertPlaceholder('nobindkickMsg', tag.value)
                              "
                            >
                              {{ tag.value }}
                            </UBadge>
                          </UTooltip>
                        </div>
                        <div class="text-muted text-sm">
                          预览：
                          <MinecraftText :text="noBindKickMsgPreview" />
                        </div>
                      </div>
                    </UFormField>

                    <!-- 解绑踢出消息 -->
                    <UFormField
                      name="unbindkickMsg"
                      label="解绑踢出消息"
                      description="当玩家的社交账号被解绑时显示的踢出消息"
                    >
                      <UTextarea
                        v-model="formData.config.unbindkickMsg"
                        :rows="2"
                        :maxlength="500"
                        class="w-full"
                        placeholder="当玩家的社交账号被解绑时显示的踢出消息"
                      />
                      <div class="mt-2 space-y-2">
                        <p class="text-muted text-xs">点击变量插入到消息</p>
                        <div class="flex flex-wrap gap-1">
                          <UTooltip
                            v-for="tag in unbindKickVariables"
                            :key="tag.value"
                            :text="`${tag.label} · [${tag.example}]`"
                          >
                            <UBadge
                              :color="
                                formData.config.unbindkickMsg.includes(
                                  tag.value,
                                )
                                  ? 'primary'
                                  : 'neutral'
                              "
                              variant="subtle"
                              class="cursor-pointer"
                              @click="
                                insertPlaceholder('unbindkickMsg', tag.value)
                              "
                            >
                              {{ tag.value }}
                            </UBadge>
                          </UTooltip>
                        </div>
                        <div class="text-muted text-sm">
                          预览：
                          <MinecraftText :text="unbindKickMsgPreview" />
                        </div>
                      </div>
                    </UFormField>
                  </div>
                </template>
              </UPageCard>
            </div>
          </UForm>

          <USeparator class="my-4" />
          <div class="flex justify-end gap-2">
            <UButton
              color="neutral"
              variant="subtle"
              :disabled="isAnyLoading || !isDirty"
              :loading="isAnyLoading"
              @click="cancelChanges"
            >
              取消
            </UButton>
            <UButton
              :disabled="isAnyLoading || !isDirty"
              :loading="isAnyLoading"
              @click="form?.submit()"
            >
              保存设置
            </UButton>
          </div>
        </UContainer>
      </template>
    </UDashboardPanel>
  </div>
</template>

<script lang="ts" setup>
import type { FormSubmitEvent } from "@nuxt/ui";
import { isEqual } from "lodash-es";
import moment from "moment-timezone";
import type { z } from "zod";
import {
  BindingConfigSchema,
  CODE_MODES,
} from "~~/shared/schemas/server/binding";
import type { BindingConfig } from "~~/shared/schemas/server/binding";
import type { ServersAPI } from "~~/shared/schemas/server/servers";
import {
  renderBindFail,
  renderBindSuccess,
  renderNoBindKick,
  renderUnbindFail,
  renderUnbindKick,
  renderUnbindSuccess,
} from "~~/shared/utils/template/binding";

import ServerHeader from "@/components/header/server-header.vue";
import { useIsMobile } from "@/composables/is-mobile";
import { BindingData, ServerData } from "~/composables/api";
import { createVariablesArray } from "~/composables/use-placeholder-variables";

const isMobile = useIsMobile();

const { setPageState, clearPageState } = usePageStateStore();

definePageMeta({ layout: "default" });

const route = useRoute();
const toast = useToast();
const form = useTemplateRef("form");

interface FormState {
  config: BindingConfig;
}

const formData = reactive<FormState>({
  config: BindingConfigSchema.parse({}),
});

let serverData: z.infer<typeof ServersAPI.GET.response> | null = null;

const originalFormData = ref<FormState | null>(null);

const loadingMap = reactive({
  isLoading: true,
  isSubmitting: false,
});

const isDirty = computed(() => !isEqual(formData, originalFormData.value));
const isAnyLoading = computed(() => Object.values(loadingMap).some(Boolean));

const codeModeOptions = [
  { label: "纯数字", value: CODE_MODES.NUMBER },
  { label: "纯单词 (小写)", value: CODE_MODES.LOWER },
  { label: "纯单词 (大写)", value: CODE_MODES.UPPER },
  { label: "纯单词 (大小写)", value: CODE_MODES.WORD },
  { label: "大小写单词和数字", value: CODE_MODES.MIX },
];

const bindCommandExample = computed(
  () =>
    formData.config.prefix +
    generateVerificationCode(
      formData.config.codeMode,
      formData.config.codeLength,
    ),
);

const unbindCommandExample = computed(
  () => `${formData.config.unbindPrefix}Steve`,
);

const bindExpireTimeExample = computed(() => {
  const expireTime = formData.config.codeExpire;
  return moment().add(expireTime, "minutes").format("YYYY-MM-DD HH:mm:ss");
});

const noBindKickMsgPreview = computed(() =>
  renderNoBindKick(
    formData.config.nobindkickMsg,
    "Steve",
    bindCommandExample.value,
    bindExpireTimeExample.value,
  ),
);

const unbindKickMsgPreview = computed(() =>
  renderUnbindKick(formData.config.unbindkickMsg, "114514"),
);

const noBindKickVariables = computed(() =>
  createVariablesArray({
    "{message}": { example: bindCommandExample.value, label: "消息" },
    "{name}": { example: "Steve", label: "玩家名" },
    "{time}": { example: bindExpireTimeExample.value, label: "过期时间" },
  }),
);

const unbindKickVariables = computed(() =>
  createVariablesArray({
    "{social_account}": { example: "114514", label: "社交账号" },
  }),
);

const bindSuccessVariables = computed(() =>
  createVariablesArray({
    "{user}": { example: "Steve", label: "玩家名" },
  }),
);

const bindFailVariables = computed(() =>
  createVariablesArray({
    "{user}": { example: "Steve", label: "玩家名" },
    "{why}": { example: "因为某种奇妙の原因", label: "原因" },
  }),
);

const unbindSuccessVariables = computed(() =>
  createVariablesArray({
    "{user}": { example: "Steve", label: "玩家名" },
  }),
);

const unbindFailVariables = computed(() =>
  createVariablesArray({
    "{user}": { example: "Steve", label: "玩家名" },
    "{why}": { example: "因为某种奇妙の原因", label: "原因" },
  }),
);

const insertPlaceholder = (
  field: keyof Pick<
    BindingConfig,
    | "nobindkickMsg"
    | "unbindkickMsg"
    | "bindSuccessMsg"
    | "bindFailMsg"
    | "unbindSuccessMsg"
    | "unbindFailMsg"
  >,
  placeholder: string,
) => {
  const current = formData.config[field] || "";
  formData.config[field] = current + placeholder;
};

const refreshServerData = async (): Promise<void> => {
  if (!route.params["id"]) {
    return;
  }
  loadingMap.isLoading = true;
  try {
    const data = await ServerData.get(Number(route.params["id"]));
    serverData = data;
    formData.config = structuredClone(
      data.bindingConfig || BindingConfigSchema.parse({}),
    );
    originalFormData.value = structuredClone(toRaw(formData));
  } catch (error) {
    console.error("Failed to refresh server data:", error);
    toast.add({ color: "error", title: "刷新服务器数据失败" });
  } finally {
    loadingMap.isLoading = false;
  }
};

const handleSubmit = async () => {
  if (!isDirty.value) {
    return;
  }

  loadingMap.isSubmitting = true;
  try {
    await BindingData.patch(serverData?.id ?? Number(route.params["id"]), {
      config: formData.config,
    });
    toast.add({ color: "success", title: "绑定配置已保存" });
    await refreshServerData();
  } catch (error) {
    console.error("Submit failed:", error);
    toast.add({ color: "error", title: "保存配置失败，请稍后再试" });
  } finally {
    loadingMap.isSubmitting = false;
  }
};

type BindingConfigOutput = z.output<typeof BindingConfigSchema>;

const onFormSubmit = async (event: FormSubmitEvent<BindingConfigOutput>) => {
  formData.config = event.data;
  await handleSubmit();
};

const cancelChanges = () => {
  formData.config = originalFormData.value
    ? structuredClone(toRaw(originalFormData.value.config))
    : BindingConfigSchema.parse({});
};

onMounted(async () => {
  await refreshServerData();
  setPageState({ isDirty: () => isDirty.value, save: handleSubmit });
});

onUnmounted(() => {
  clearPageState();
});
</script>
