<template>
  <div>
    <HeaderServer class="mb-4" />

    <n-form ref="formRef" :model="formData" :rules="rules">
      <!-- 基础配置区域 -->
      <div class="grid grid-cols-1 gap-6 mb-6 lg:grid-cols-2">
        <!-- 基础设置 -->
        <n-card class="h-fit" size="small" title="基础设置">
          <template #header-extra>
            <n-tag :type="formData.enabled ? 'success' : 'default'" round size="small">
              {{ formData.enabled ? "已启用" : "未启用" }}
            </n-tag>
          </template>

          <n-form-item label="启用聊天同步" path="enabled">
            <n-switch v-model:value="formData.enabled" />
          </n-form-item>
          <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
            <n-form-item label="MC → 平台" path="mcToPlatformEnabled">
              <n-switch v-model:value="formData.mcToPlatformEnabled" :disabled="!formData.enabled" />
            </n-form-item>

            <n-form-item label="平台 → MC" path="platformToMcEnabled">
              <n-switch v-model:value="formData.platformToMcEnabled" :disabled="!formData.enabled" />
            </n-form-item>
          </div>
        </n-card>

        <!-- 消息过滤配置 -->
        <n-card class="h-full" size="small" title="消息过滤">
          <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
            <n-form-item label="最小长度" path="filters.minMessageLength">
              <n-input-number
                v-model:value="formData.filters.minMessageLength"
                :max="1000"
                :min="0"
                class="w-full"
                placeholder="最小消息字符数"
              />
            </n-form-item>

            <n-form-item label="最大长度" path="filters.maxMessageLength">
              <n-input-number
                v-model:value="formData.filters.maxMessageLength"
                :max="5000"
                :min="1"
                class="w-full"
                placeholder="最大消息字符数"
              />
            </n-form-item>
          </div>

          <n-form-item label="屏蔽关键词" path="filters.blacklistKeywords">
            <n-input
              v-model:value="keywordsText"
              :maxlength="200"
              placeholder="用逗号分隔多个关键词，如：广告,刷屏,垃圾"
              show-count
            />
            <template #feedback>
              <div class="text-sm text-gray-500">包含这些关键词的消息将被过滤，不会转发</div>
            </template>
          </n-form-item>
        </n-card>
      </div>

      <!-- 消息模板配置 -->
      <div class="mt-6">
        <n-card size="small" title="消息模板配置">
          <div class="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <!-- MC → 平台模板 -->
            <n-card embedded size="small">
              <template #header>
                <div class="flex items-center gap-2">
                  <span>MC → 平台模板</span>
                  <n-tag size="small" type="primary">游戏到平台</n-tag>
                </div>
              </template>

              <div class="space-y-4">
                <n-form-item label="模板内容" label-placement="top" path="mcToPlatformTemplate">
                  <n-input
                    v-model:value="formData.mcToPlatformTemplate"
                    :maxlength="200"
                    :rows="3"
                    placeholder="MC 消息发送到平台的格式模板"
                    show-count
                    type="textarea"
                  />
                  <template #feedback>
                    <div class="mt-2 space-y-2">
                      <div class="flex flex-wrap gap-1">
                        <n-tooltip v-for="tag in mcToPlatformVariables" :key="tag.value" trigger="hover">
                          <template #trigger>
                            <n-tag
                              :type="formData.mcToPlatformTemplate.includes(tag.value) ? 'primary' : 'default'"
                              class="cursor-pointer"
                              size="small"
                              @click="insertPlaceholder('mcToPlatformTemplate', tag.value)"
                            >
                              {{ tag.value }}
                            </n-tag>
                          </template>
                          {{ tag.label }} · [{{ tag.example }}]
                        </n-tooltip>
                      </div>
                      <div class="text-sm text-gray-500">
                        预览:
                        <n-text type="info">{{ mcToPlatformPreview }}</n-text>
                      </div>
                    </div>
                  </template>
                </n-form-item>
              </div>
            </n-card>

            <!-- 平台 → MC模板 -->
            <n-card embedded size="small">
              <template #header>
                <div class="flex items-center gap-2">
                  <span>平台 → MC模板</span>
                  <n-tag size="small" type="success">平台到游戏</n-tag>
                </div>
              </template>

              <div class="space-y-4">
                <n-form-item label="模板内容" label-placement="top" path="platformToMcTemplate">
                  <n-input
                    v-model:value="formData.platformToMcTemplate"
                    :maxlength="200"
                    :rows="3"
                    placeholder="平台消息发送到 MC 的格式模板"
                    show-count
                    type="textarea"
                  />
                  <template #feedback>
                    <div class="mt-2 space-y-2">
                      <div class="flex flex-wrap gap-1">
                        <n-tooltip v-for="tag in platformToMcVariables" :key="tag.value" trigger="hover">
                          <template #trigger>
                            <n-tag
                              :type="formData.platformToMcTemplate.includes(tag.value) ? 'success' : 'default'"
                              class="cursor-pointer"
                              size="small"
                              @click="insertPlaceholder('platformToMcTemplate', tag.value)"
                            >
                              {{ tag.value }}
                            </n-tag>
                          </template>
                          {{ tag.label }} · [{{ tag.example }}]
                        </n-tooltip>
                      </div>
                      <div class="text-sm text-gray-500">
                        预览:
                        <n-text type="success">{{ platformToMcPreview }}</n-text>
                      </div>
                    </div>
                  </template>
                </n-form-item>
              </div>
            </n-card>
          </div>
        </n-card>
      </div>
    </n-form>

    <div class="mt-6">
      <div class="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div class="space-y-6">
          <n-card class="h-full" size="small" title="配置群聊">
            单独对目标进行配置
            <template #footer>
              <n-dropdown v-if="options.length" trigger="hover" :options="options" @select="handleSelect">
                <n-button>配置目标</n-button>
              </n-dropdown>
              <n-alert v-else type="warning">
                <n-button text dashed @click="router.push(`/servers/${route.params.id}/target`)">
                  你还没有创建目标哦（去创建）
                </n-button>
              </n-alert>
            </template>
          </n-card>
        </div>
      </div>
    </div>

    <n-drawer v-model:show="drawerVisible" :width="502">
      <n-drawer-content v-if="selectTarget" closable :title="`目标配置 · ${selectTarget.targetId || selectTarget.id}`">
        <n-form :model="selectTarget">
          <n-form-item label="是否开启此目标的聊天同步">
            <n-switch v-model:value="selectTarget.config.chatSyncConfigSchema.enabled" />
          </n-form-item>
        </n-form>
      </n-drawer-content>
    </n-drawer>

    <!-- 操作按钮区 -->
    <n-divider />
    <div class="flex justify-end gap-2">
      <n-button :disabled="isAnyLoading || !isDirty" :loading="isAnyLoading" @click="cancelChanges">取消更改</n-button>
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
        保存配置
      </n-button>
    </div>
  </div>
</template>

<script lang="ts" setup>
// ==================== 导入 ====================
import { StatusCodes } from "http-status-codes";
import type { FormInst } from "naive-ui";
import type { z } from "zod";
import type { PageState } from "~~/app/composables/usePageState";
import {
  chatSyncConfigSchema,
  type ChatSyncConfig,
  type chatSyncPatchBodySchema
} from "~~/shared/schemas/server/chatSync";
import type { ServerWithStatus } from "~~/shared/schemas/server/servers";
import type { targetSchema } from "~~/shared/schemas/server/target";
import type { ApiResponse } from "~~/shared/types";
import {
  formatMCToPlatformMessage,
  formatPlatformToMCMessage,
  getDefaultChatSyncConfig
} from "~~/shared/utils/chatSync";
import { zodToNaiveRules } from "~~/shared/utils/validation";

// ==================== 类型 ====================
export type ChatSyncPatchBody = z.infer<typeof chatSyncPatchBodySchema>;

// ==================== 页面配置 ====================
definePageMeta({ layout: "server-edit" });

// ==================== 依赖注入 / 工具 ====================
const registerPageState = inject<(state: PageState) => void>("registerPageState");
const clearPageState = inject<() => void>("clearPageState");
const route = useRoute();
const router = useRouter();
const message = useMessage();

// ==================== 表单数据和验证 ====================
const formRef = ref<FormInst>();
const formData = ref<ChatSyncConfig>(getDefaultChatSyncConfig());
const rules = zodToNaiveRules(chatSyncConfigSchema);

// ==================== 关键词处理 ====================
const keywordsText = computed({
  get() {
    return (formData.value.filters.blacklistKeywords || []).join(",");
  },
  set(v: string) {
    formData.value.filters.blacklistKeywords = v
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
  }
});

// ==================== 目标编辑缓存 ====================
const editedTargets = ref(new Map<string, targetSchema>());
const selectTarget = ref<targetSchema | null>(null);
const drawerVisible = ref(false);

// ==================== 数据状态 ====================
const dataState = reactive({
  data: { serverData: null as ServerWithStatus | null },
  isLoading: true,
  isSubmitting: false,
  original: { ChatSyncConfig: null as ChatSyncConfig | null }
});

// ==================== 计算属性 ====================
function getOriginalTargetById(id: string): targetSchema | null {
  return dataState.data.serverData?.targets.find((t) => t.id === id) || null;
}

const modifiedTargets = computed(() => {
  const list = Array.from(editedTargets.value.values());
  return list.filter((t) => {
    const original = getOriginalTargetById(t.id);
    if (!original) return true;
    return JSON.stringify(t.config) !== JSON.stringify(original.config);
  });
});

const isDirty = computed(() => {
  const formChanged =
    !dataState.isLoading && JSON.stringify(formData.value) !== JSON.stringify(dataState.original.ChatSyncConfig);
  const targetsChanged = modifiedTargets.value.length > 0;
  return formChanged || targetsChanged;
});

const isAnyLoading = computed(() => dataState.isLoading || dataState.isSubmitting);

const options = computed(
  () => dataState.data.serverData?.targets?.map((target) => ({ label: target.targetId, key: target.id })) || []
);

function pickEditableTarget(raw: targetSchema): targetSchema {
  const id = raw.id;
  if (!editedTargets.value.has(id)) {
    editedTargets.value.set(id, JSON.parse(JSON.stringify(raw)));
  }
  return editedTargets.value.get(id) as targetSchema;
}

function handleSelect(key: string) {
  drawerVisible.value = true;
  const selected = dataState.data.serverData?.targets.find((t) => t.id.toString() === key) || null;
  if (selected) {
    const editable = pickEditableTarget(selected);
    selectTarget.value = editable;
  }
}

// ==================== 模板变量定义（预览） ====================
const serverData = await getServerData();
const mcToPlatformVariables = [
  { label: "玩家名", value: "{playerName}", example: "Steve" },
  { label: "玩家UUID", value: "{playerUUID}", example: "12345678-1234-1234..." },
  { label: "消息内容", value: "{message}", example: "Hello world!" },
  { label: "服务器名", value: "{serverName}", example: serverData.name },
  { label: "时间戳", value: "{timestamp}", example: "2024-01-01 12:00:00" }
];

const platformToMcVariables = [
  { label: "平台名", value: "{platform}", example: "Onebot" },
  { label: "昵称", value: "{nickname}", example: "Alice" },
  { label: "用户ID", value: "{userId}", example: "123456789" },
  { label: "消息内容", value: "{message}", example: "Hi everyone!" },
  { label: "时间戳", value: "{timestamp}", example: "2024-01-01 12:00:00" }
];

const mcToPlatformPreview = computed(() => {
  return formatMCToPlatformMessage(formData.value.mcToPlatformTemplate, {
    playerName: "Steve",
    playerUUID: "12345678-1234-1234-1234-123456789abc",
    message: "Hello world!",
    serverName: serverData.name,
    timestamp: Date.now()
  });
});

const platformToMcPreview = computed(() => {
  return formatPlatformToMCMessage(formData.value.platformToMcTemplate, {
    platform: "Onebot",
    nickname: "Alice",
    userId: "123456789",
    message: "Hi everyone!",
    timestamp: Date.now()
  });
});

// ==================== 模板插入函数 ====================
function insertPlaceholder(
  field: keyof Pick<ChatSyncConfig, "mcToPlatformTemplate" | "platformToMcTemplate">,
  placeholder: string
) {
  const current = formData.value[field] || "";
  formData.value[field] = current + placeholder;
}

// ==================== 数据管理类 ====================
class DataManager {
  async refreshServerData(): Promise<void> {
    if (!route.params?.id) return;
    try {
      const response = await $fetch<ApiResponse<ServerWithStatus>>(`/api/servers/${route.params.id}`);
      if (response.code === StatusCodes.OK && response.data) {
        dataState.data.serverData = response.data;
        dataState.original.ChatSyncConfig = response.data.chatSyncConfig;
        formData.value = JSON.parse(JSON.stringify(response.data.chatSyncConfig));
      }
    } catch (error) {
      console.error("Failed to refresh server data:", error);
      message.error("刷新服务器数据失败");
    }
  }

  async updateServer(serverId: number, body: ChatSyncPatchBody): Promise<void> {
    await $fetch<ApiResponse<ServerWithStatus>>(`/api/servers/${serverId}/chatSync`, { method: "PATCH", body });
    dataState.original.ChatSyncConfig = JSON.parse(JSON.stringify(body.chatsync));
  }

  async refreshAll(): Promise<void> {
    dataState.isLoading = true;
    await this.refreshServerData().finally(() => {
      dataState.isLoading = false;
    });
  }
}

const dataManager = new DataManager();

// ==================== 事件处理函数 ====================
async function handleSubmit() {
  if (!dataState.data.serverData) {
    message.error("服务器数据未加载或无效");
    return;
  }
  if (!isDirty.value) {
    message.info("没有需要保存的更改");
    return;
  }

  try {
    await formRef.value?.validate();
  } catch {
    return;
  }

  const targetsPayload: ChatSyncPatchBody["targets"] = modifiedTargets.value.map((t) => ({
    id: t.id,
    config: t.config
  }));
  if (!targetsPayload.length && selectTarget.value) {
    const t = selectTarget.value;
    targetsPayload.push({ id: t.id, config: t.config });
  }

  const payload: ChatSyncPatchBody = { chatsync: formData.value, targets: targetsPayload };

  try {
    dataState.isSubmitting = true;
    await dataManager.updateServer(dataState.data.serverData.id, payload);
    message.success("消息同步配置已保存");
    dataState.isSubmitting = false;
    editedTargets.value.clear();
    selectTarget.value = null;
    await dataManager.refreshAll();
  } catch (error) {
    console.error("Submit failed:", error);
    dataState.isSubmitting = false;
  }
}

function cancelChanges() {
  if (dataState.original.ChatSyncConfig) {
    formData.value = JSON.parse(JSON.stringify(dataState.original.ChatSyncConfig));
  } else {
    formData.value = getDefaultChatSyncConfig();
  }
  editedTargets.value.clear();
  selectTarget.value = null;
}

// ==================== 生命周期钩子 ====================
onMounted(async () => {
  await dataManager.refreshAll();
  if (registerPageState) {
    registerPageState({ isDirty: () => isDirty.value, save: handleSubmit });
  }
});

onUnmounted(() => {
  if (clearPageState) clearPageState();
});
</script>
