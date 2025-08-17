<template>
  <div>
    <HeaderServer
      :title="found.label"
      :server-name="serverData?.name || ''"
      back-button-text="服务器列表"
      back-path="/"
      :desc="found.desc"
      class="mb-4"
    />
    <n-form ref="formRef" :model="formData" :rules="rules">
      <div class="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div class="space-y-6">
          <n-card title="基础设置" size="small" class="h-fit">
            <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
              <n-form-item label="绑定数量" path="maxBindCount">
                <n-input-number v-model:value="formData.maxBindCount" placeholder="请输入最大绑定数量" class="w-full" />
              </n-form-item>

              <n-form-item label="验证码长度" path="codeLength">
                <n-input-number
                  v-model:value="formData.codeLength"
                  placeholder="生成的验证码字符数量，影响验证码复杂度"
                  class="w-full"
                />
              </n-form-item>

              <n-form-item label="验证码模式" path="codeMode">
                <n-select
                  v-model:value="formData.codeMode"
                  :options="codeModeOptions"
                  placeholder="请选择验证码生成模式"
                  class="w-full"
                />
              </n-form-item>

              <n-form-item label="验证码过期时间" path="codeExpire">
                <n-input-number
                  v-model:value="formData.codeExpire"
                  :min="1"
                  :step="1"
                  placeholder="验证码过期时间（秒）"
                  class="w-full"
                >
                  <template #suffix>分钟</template>
                </n-input-number>
              </n-form-item>
            </div>
            <n-form-item label="绑定前缀" path="prefix">
              <n-input
                v-model:value="formData.prefix"
                placeholder="如：/绑定 ，用于绑定账号的指令前缀"
                show-count
                class="w-full"
                :maxlength="50"
              />
            </n-form-item>
            <n-form-item label="解绑前缀" path="unbindPrefix">
              <n-input
                v-model:value="formData.unbindPrefix"
                :placeholder="`如：/解绑 ，用于解绑账号的专用指令前缀，留空则用绑定前缀+玩家名`"
                show-count
                class="w-full"
                :maxlength="50"
              />
            </n-form-item>
            <n-form-item label="允许解绑">
              <div class="switch-wrapper">
                <n-switch v-model:value="formData.allowUnbind" />
              </div>
            </n-form-item>
          </n-card>

          <n-card title="指令与反馈示例" size="small" class="h-fit">
            <div class="mb-2">
              <n-text strong>指令示例预览</n-text>
            </div>
            <div class="mb-2">
              <n-text type="primary" class="mb-2" round>
                <h1>绑定指令</h1>
                <p class="text-gray-500">用户在QQ群或其他社交平台聊天中发送此指令来绑定游戏账号</p>
              </n-text>
              <div class="mb-2 p-2">
                <n-code :code="bindCommandExample" language="text" />
              </div>
            </div>
            <n-collapse-transition :show="formData.allowUnbind">
              <n-text type="warning" class="mb-2" round>
                <h1>解绑指令</h1>
                <p class="text-gray-500">使用专用解绑前缀进行解绑操作，直接输入玩家名称即可</p>
              </n-text>
              <div class="mb-2 p-2">
                <n-code :code="unbindCommandExample" language="text" />
              </div>
            </n-collapse-transition>
          </n-card>
        </div>

        <div class="space-y-6">
          <n-card title="反馈消息配置" size="small" class="h-fit">
            <n-form-item label="绑定成功" path="bindSuccessMsg" class="mb-2">
              <n-input
                v-model:value="formData.bindSuccessMsg"
                maxlength="200"
                show-count
                placeholder="绑定成功时的反馈消息，支持#user占位符"
              />
              <template #feedback>
                <div class="mt-2 space-y-2">
                  <div class="flex flex-wrap gap-1">
                    <n-tooltip trigger="hover">
                      <template #trigger>
                        <n-tag size="tiny">#user</n-tag>
                      </template>
                      用户名 · [Steve]
                    </n-tooltip>
                  </div>
                  <div class="text-sm text-gray-500">
                    预览:
                    <n-text type="success">
                      {{ replaceBindSuccessMsgPlaceholders(formData.bindSuccessMsg, "Steve") }}
                    </n-text>
                  </div>
                </div>
              </template>
            </n-form-item>

            <n-form-item label="绑定失败" path="bindFailMsg" class="mb-2">
              <n-input
                v-model:value="formData.bindFailMsg"
                maxlength="200"
                show-count
                placeholder="绑定失败时的反馈消息"
              />
              <template #feedback>
                <div class="mt-2 space-y-2">
                  <div class="flex flex-wrap gap-1">
                    <n-tooltip trigger="hover">
                      <template #trigger>
                        <n-tag size="tiny">#user</n-tag>
                      </template>
                      用户名 · [Steve]
                    </n-tooltip>
                    <n-tooltip trigger="hover">
                      <template #trigger>
                        <n-tag size="tiny">#why</n-tag>
                      </template>
                      失败原因 · [因为某种奇妙の原因]
                    </n-tooltip>
                  </div>
                  <div class="text-sm text-gray-500">
                    预览:
                    <n-text type="error">
                      {{ replaceBindFailMsgPlaceholders(formData.bindFailMsg, "Steve", "因为某种奇妙の原因") }}
                    </n-text>
                  </div>
                </div>
              </template>
            </n-form-item>

            <n-form-item label="解绑成功" path="unbindSuccessMsg" class="mb-2">
              <n-input
                v-model:value="formData.unbindSuccessMsg"
                maxlength="200"
                show-count
                placeholder="解绑成功时的反馈消息，支持#user占位符"
              />
              <template #feedback>
                <div class="mt-2 space-y-2">
                  <div class="flex flex-wrap gap-1">
                    <n-tooltip trigger="hover">
                      <template #trigger>
                        <n-tag size="tiny">#user</n-tag>
                      </template>
                      用户名 · [Steve]
                    </n-tooltip>
                  </div>
                  <div class="text-sm text-gray-500">
                    预览:
                    <n-text type="success">{{
                      replaceBindSuccessMsgPlaceholders(formData.unbindSuccessMsg, "Steve")
                    }}</n-text>
                  </div>
                </div>
              </template>
            </n-form-item>

            <n-form-item label="解绑失败" path="unbindFailMsg" class="mb-2">
              <n-input
                v-model:value="formData.unbindFailMsg"
                maxlength="200"
                show-count
                placeholder="解绑失败时的反馈消息"
              />
              <template #feedback>
                <div class="mt-2 space-y-2">
                  <div class="flex flex-wrap gap-1">
                    <n-tooltip trigger="hover">
                      <template #trigger>
                        <n-tag size="tiny">#user</n-tag>
                      </template>
                      用户名 · [Steve]
                    </n-tooltip>
                    <n-tooltip trigger="hover">
                      <template #trigger>
                        <n-tag size="tiny">#why</n-tag>
                      </template>
                      失败原因 · [因为某种奇妙の原因]
                    </n-tooltip>
                  </div>
                  <div class="text-sm text-gray-500">
                    预览:
                    <n-text type="error">{{
                      replaceBindFailMsgPlaceholders(formData.unbindFailMsg, "Steve", "因为某种奇妙の原因")
                    }}</n-text>
                  </div>
                </div>
              </template>
            </n-form-item>
          </n-card>

          <n-card title="绑定提示" size="small" class="h-fit">
            <n-form-item label="强制绑定">
              <n-switch v-model:value="formData.forceBind" />
            </n-form-item>

            <n-form-item label="未绑定踢出消息" path="nobindkickMsg" class="mb-2">
              <n-input
                v-model:value="formData.nobindkickMsg"
                type="textarea"
                :rows="3"
                maxlength="500"
                show-count
                placeholder="当玩家未绑定社交账号时显示的踢出消息，支持颜色代码"
              />
              <template #feedback>
                <div class="mt-2 space-y-2">
                  <div class="flex flex-wrap gap-1">
                    <n-tooltip trigger="hover">
                      <template #trigger>
                        <n-tag size="tiny">#name</n-tag>
                      </template>
                      玩家名 · [Steve]
                    </n-tooltip>
                    <n-tooltip trigger="hover">
                      <template #trigger>
                        <n-tag size="tiny">#message</n-tag>
                      </template>
                      {{ "绑定指令 · [" + bindCommandExample + "]" }}
                    </n-tooltip>
                    <n-tooltip trigger="hover">
                      <template #trigger>
                        <n-tag size="tiny">#time</n-tag>
                      </template>
                      {{ "时间 · [" + bindExpireTimeExample + "]" }}
                    </n-tooltip>
                  </div>
                  <div class="text-sm text-gray-500">
                    预览:
                    <n-text>
                      <span v-html="noBindKickMsgPreview"></span>
                    </n-text>
                  </div>
                </div>
              </template>
            </n-form-item>

            <n-form-item label="解绑踢出消息" path="unbindkickMsg" class="mb-2">
              <n-input
                v-model:value="formData.unbindkickMsg"
                type="textarea"
                :rows="2"
                maxlength="500"
                show-count
                placeholder="当玩家的社交账号被解绑时显示的踢出消息"
              />
              <template #feedback>
                <div class="mt-2 space-y-2">
                  <div class="flex flex-wrap gap-1">
                    <n-tooltip trigger="hover">
                      <template #trigger>
                        <n-tag size="tiny">#social_account</n-tag>
                      </template>
                      社交账号 · [114514]
                    </n-tooltip>
                  </div>
                  <div class="text-sm text-gray-500">
                    预览:
                    <n-text>
                      <span v-html="unbindKickMsgPreview"></span>
                    </n-text>
                  </div>
                </div>
              </template>
            </n-form-item>
          </n-card>
        </div>
      </div>
    </n-form>
    <n-divider />
    <div class="flex justify-end gap-2">
      <n-button :loading="isAnyLoading" :disabled="isAnyLoading || !isDirty" @click="cancelChanges">取消</n-button>
      <n-button ghost type="primary" :loading="isAnyLoading" :disabled="isAnyLoading || !isDirty" @click="handleSubmit"
        >保存设置</n-button
      >
    </div>
  </div>
</template>

<script setup lang="ts">
// ==================== 导入 ====================
import { StatusCodes } from "http-status-codes";
import type { FormInst } from "naive-ui";
import type { MenuItem } from "~/layouts/serverEdit.vue";
import {
  type BindingConfig,
  BindingConfigSchema,
  CODE_MODES,
  getDefaultServerConfig
} from "~~/shared/schemas/server/config";
import type { ServerWithStatus } from "~~/shared/schemas/server/servers";
import type { ApiResponse } from "~~/shared/types";
import moment from "moment-timezone";

// ==================== 页面配置 ====================
definePageMeta({
  layout: "server-edit"
});

// ==================== 组合式函数和依赖注入 ====================
const { minecraftToHtml, initObfuscatedAnimation, stopObfuscatedAnimation } = useMinecraftFormat();
const menuOptions: Ref<MenuItem[]> = inject(
  "menuOptions",
  computed(() => [])
);
const registerPageState = inject<(state: PageState) => void>("registerPageState");
const clearPageState = inject<() => void>("clearPageState");
const route = useRoute();
const message = useMessage();
const { serverData: serverData } = getServerData.value;

// ==================== 计算属性 ====================
const found = computed(() => {
  const found = menuOptions.value.find((item) => item.key === route.path);
  if (!found) throw new Error(`Menu item not found for path: ${route.path}`);
  return found;
});

const isDirty = computed(
  () =>
    dataState.isSubmitting ||
    (!dataState.isLoading && JSON.stringify(formData.value) !== JSON.stringify(dataState.original.bindingConfig))
);
const isAnyLoading = computed(() => dataState.isLoading);

// ==================== 类型定义 ====================
interface DataState {
  data: {
    serverData: ServerWithStatus | null;
  };
  isLoading: boolean;
  isSubmitting: boolean;
  original: {
    bindingConfig: BindingConfig | null;
  };
}

// ==================== 数据状态 ====================
const dataState = reactive<DataState>({
  data: {
    serverData: null
  },
  isLoading: true,
  isSubmitting: false,
  original: { bindingConfig: null }
});
// ==================== 数据管理类 ====================

class DataManager {
  async refreshServerData(): Promise<void> {
    if (!route.params?.["id"]) return;
    try {
      const response = await $fetch<ApiResponse<ServerWithStatus>>(`/api/servers/${route.params["id"]}`);
      if (response.code === StatusCodes.OK && response.data) {
        dataState.data.serverData = response.data;
        dataState.original = { bindingConfig: response.data.bindingConfig };
        formData.value = JSON.parse(JSON.stringify(response.data.bindingConfig));
      }
    } catch (error) {
      console.error("Failed to refresh server data:", error);
      message.error("刷新服务器数据失败");
    }
  }

  async updateServerBindingConfig(serverId: number, bindingConfig: BindingConfig): Promise<void> {
    try {
      dataState.isSubmitting = true;
      await $fetch<ApiResponse<BindingConfig>>(`/api/servers/${serverId}/binding`, {
        method: "POST",
        body: bindingConfig
      });
      message.success("适配器设置已保存");
      dataState.original.bindingConfig = bindingConfig;
    } catch (error) {
      console.error("Submit failed:", error);
      message.error("适配器设置保存失败");
      throw error;
    } finally {
      dataState.isSubmitting = false;
    }
  }

  async handleSubmit(): Promise<void> {
    if (!dataState.data.serverData) {
      message.error("服务器数据未加载或无效");
      return;
    }

    if (!formData.value) {
      message.error("表单数据无效");
      return;
    }

    const hasChanges = JSON.stringify(formData.value) !== JSON.stringify(dataState.original.bindingConfig);
    if (!hasChanges) {
      message.info("没有需要保存的更改");
      return;
    }

    try {
      await this.updateServerBindingConfig(dataState.data.serverData.id, formData.value);
      Object.assign(dataState.data.serverData, { bindingConfig: formData.value });
      await this.refreshAll();
    } catch (error) {
      console.error("Submit failed:", error);
    }
  }

  async refreshAll(): Promise<void> {
    dataState.isLoading = true;
    await Promise.all([this.refreshServerData()]).finally(() => {
      dataState.isLoading = false;
    });
  }
}
// ==================== 表单数据和验证 ====================

const formRef = ref<FormInst>();
const formData = ref<BindingConfig>(getDefaultServerConfig());
const rules = zodToNaiveRules(BindingConfigSchema);
const codeModeOptions = [
  { label: "纯数字", value: CODE_MODES.NUMBER },
  { label: "纯单词(小写)", value: CODE_MODES.LOWER },
  { label: "纯单词(大写)", value: CODE_MODES.UPPER },
  { label: "纯单词(大小写)", value: CODE_MODES.WORD },
  { label: "大小写单词和数字", value: CODE_MODES.MIX }
];
const bindCommandExample = computed(() => {
  return formData.value.prefix + generateVerificationCode(formData.value.codeMode, formData.value.codeLength);
});
const unbindCommandExample = computed(() => {
  return formData.value.unbindPrefix + "Steve";
});

// 时间 + 过期时间
const bindExpireTimeExample = computed(() => {
  const expireTime = formData.value.codeExpire;
  return moment().add(expireTime, "seconds").format("YYYY-MM-DD HH:mm:ss");
});

const noBindKickMsgPreview = computed(() => {
  const replaced = replaceNoBindKickMsgPlaceholders(
    formData.value.nobindkickMsg,
    "Steve",
    bindCommandExample.value,
    bindExpireTimeExample.value
  );
  return minecraftToHtml(replaced);
});

const unbindKickMsgPreview = computed(() => {
  const replaced = replaceUnbindKickMsgPlaceholders(formData.value.unbindkickMsg, "114514");
  return minecraftToHtml(replaced);
});

// ==================== 数据管理器实例 ====================
const dataManager = new DataManager();

// ==================== 事件处理函数 ====================
async function handleSubmit() {
  await dataManager.handleSubmit();
}

function cancelChanges() {
  if (dataState.original.bindingConfig) {
    formData.value = JSON.parse(JSON.stringify(dataState.original.bindingConfig));
  } else {
    formData.value = getDefaultServerConfig();
  }
}

// ==================== 生命周期钩子 ====================
onMounted(async () => {
  await dataManager.refreshAll();
  // 初始化混淆动画
  initObfuscatedAnimation();
  if (registerPageState) {
    registerPageState({
      isDirty: () => isDirty.value,
      save: handleSubmit
    });
  }
});

onUnmounted(() => {
  // 清理混淆动画
  stopObfuscatedAnimation();
  if (clearPageState) {
    clearPageState();
  }
});

// 监听表单数据变化，重新初始化动画
watch(
  () => [formData.value.nobindkickMsg, formData.value.unbindkickMsg],
  () => {
    nextTick(() => {
      initObfuscatedAnimation();
    });
  }
);
</script>
