<template>
  <div>
    <HeaderServer :desc="found.desc" :server-name="serverData?.name || ''" :title="found.label" back-button-text="服务器列表"
      back-path="/servers" class="mb-4" />

    <n-form ref="formRef" :model="formData" :rules="rules">
      <!-- 基础配置区域 -->
      <div class="grid grid-cols-1 gap-6 lg:grid-cols-2 mb-6">
        <!-- 基础设置 -->
        <n-card class="h-fit" size="small" title="基础设置">
          <template #header-extra>
            <n-tag :type="formData.enabled ? 'success' : 'default'" size="small" round>
              {{ formData.enabled ? "已启用" : "未启用" }}
            </n-tag>
          </template>

          <n-form-item label="启用聊天同步" path="enabled">
            <div class="switch-wrapper">
              <n-switch v-model:value="formData.enabled" />
            </div>
          </n-form-item>
          <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
            <n-form-item label="MC → 平台" path="mcToPlatformEnabled">
              <div class="switch-wrapper">
                <n-switch v-model:value="formData.mcToPlatformEnabled" :disabled="!formData.enabled" />
              </div>
            </n-form-item>

            <n-form-item label="平台 → MC" path="platformToMcEnabled">
              <div class="switch-wrapper">
                <n-switch v-model:value="formData.platformToMcEnabled" :disabled="!formData.enabled" />
              </div>
            </n-form-item>
          </div>

        </n-card>

        <!-- 消息过滤配置 -->
        <n-card class="h-full" size="small" title="消息过滤">

          <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
            <n-form-item label="最小长度" path="filters.minMessageLength">
              <n-input-number v-model:value="formData.filters.minMessageLength" :min="0" :max="1000" class="w-full"
                placeholder="最小消息字符数" />
            </n-form-item>

            <n-form-item label="最大长度" path="filters.maxMessageLength">
              <n-input-number v-model:value="formData.filters.maxMessageLength" :min="1" :max="5000" class="w-full"
                placeholder="最大消息字符数" />
            </n-form-item>
          </div>

          <n-form-item label="屏蔽关键词" path="filters.blacklistKeywords">
            <n-input v-model:value="keywordsText" placeholder="用逗号分隔多个关键词，如：广告,刷屏,垃圾" show-count :maxlength="200" />
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
            <n-card size="small" embedded>
              <template #header>
                <div class="flex items-center gap-2">
                  <span>MC → 平台模板</span>
                  <n-tag size="tiny" type="primary">游戏到平台</n-tag>
                </div>
              </template>

              <div class="space-y-4">
                <n-form-item label="模板内容" label-placement="top" path="mcToPlatformTemplate">
                  <n-input v-model:value="formData.mcToPlatformTemplate" type="textarea" :rows="3"
                    placeholder="MC 消息发送到平台的格式模板" :maxlength="200" show-count />
                  <template #feedback>
                    <div class="mt-2 space-y-2">
                      <div class="flex flex-wrap gap-1">
                        <n-tooltip v-for="tag in mcToPlatformVariables" :key="tag.value" trigger="hover">
                          <template #trigger>
                            <n-tag size="tiny"
                              :type="formData.mcToPlatformTemplate.includes(tag.value) ? 'primary' : 'default'"
                              @click="insertPlaceholder('mcToPlatformTemplate', tag.value)" class="cursor-pointer">
                              {{ tag.value }}
                            </n-tag>
                          </template>
                          {{ tag.label }} · [{{ tag.example }}]
                        </n-tooltip>
                      </div>
                      <div class="text-sm text-gray-500">
                        预览:
                        <n-text type="info">
                          {{ mcToPlatformPreview }}
                        </n-text>
                      </div>
                    </div>
                  </template>
                </n-form-item>
              </div>
            </n-card>

            <!-- 平台 → MC模板 -->
            <n-card size="small" embedded>
              <template #header>
                <div class="flex items-center gap-2">
                  <span>平台 → MC模板</span>
                  <n-tag size="tiny" type="success">平台到游戏</n-tag>
                </div>
              </template>

              <div class="space-y-4">
                <n-form-item label="模板内容" label-placement="top" path="platformToMcTemplate">
                  <n-input v-model:value="formData.platformToMcTemplate" type="textarea" :rows="3"
                    placeholder="平台消息发送到 MC 的格式模板" :maxlength="200" show-count />
                  <template #feedback>
                    <div class="mt-2 space-y-2">
                      <div class="flex flex-wrap gap-1">
                        <n-tooltip v-for="tag in platformToMcVariables" :key="tag.value" trigger="hover">
                          <template #trigger>
                            <n-tag size="tiny"
                              :type="formData.platformToMcTemplate.includes(tag.value) ? 'success' : 'default'"
                              @click="insertPlaceholder('platformToMcTemplate', tag.value)" class="cursor-pointer">
                              {{ tag.value }}
                            </n-tag>
                          </template>
                          {{ tag.label }} · [{{ tag.example }}]
                        </n-tooltip>
                      </div>
                      <div class="text-sm text-gray-500">
                        预览:
                        <n-text type="success">
                          {{ platformToMcPreview }}
                        </n-text>
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

    <!-- 目标配置区域 -->
    <div class="mt-6">
      <n-card size="small" title="目标配置">
        <template #header-extra>
          <n-button size="small" type="primary" @click="addTarget">添加目标</n-button>
        </template>
        <div class="mb-4">
          <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
            <n-input v-model:value="searchText" placeholder="搜索目标ID..." clearable> </n-input>
            <n-select v-model:value="typeFilter" :options="targetTypeOptions" placeholder="类型筛选" clearable />
            <n-select v-model:value="statusFilter" :options="statusFilterOptions" placeholder="状态筛选" clearable />
          </div>
        </div>

        <n-data-table :columns="columns" :pagination="{ pageSize: 5 }" :data="data">
          <template #empty>
            <n-empty description="暂无目标配置，请添加目标">
              <template #extra>
                <n-button size="medium" type="primary" @click="addTarget">添加目标
                </n-button>
              </template>
            </n-empty>
          </template>
        </n-data-table>
      </n-card>
    </div>


    <!-- 操作按钮区 -->
    <n-divider />
    <div class="flex justify-end gap-2">
      <n-button :disabled="isAnyLoading || !isDirty" :loading="isAnyLoading" @click="cancelChanges">
        取消更改
      </n-button>
      <n-button :disabled="isAnyLoading || !isDirty" :loading="isAnyLoading" type="primary" ghost @click="handleSubmit">
        <template #icon>
          <n-icon><svg viewBox="0 0 24 24">
              <path fill="currentColor"
                d="M17 3H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V7l-4-4zm2 16H5V5h11.17L19 7.83V19zm-7-7c-1.66 0-3 1.34-3 3s1.34 3 3 3s3-1.34 3-3s-1.34-3-3-3zM6 6h9v4H6z" />
            </svg></n-icon>
        </template>
        保存配置
      </n-button>
    </div>
  </div>
</template>

<script lang="ts" setup>
// ==================== 导入 ====================
import { StatusCodes } from "http-status-codes";
import type { MenuItem } from "~/layouts/serverEdit.vue";
import { NButton, NInput, NSelect, type FormInst } from "naive-ui";
import { chatSyncConfigSchema } from "~~/shared/schemas/server/chatSync";
import type { ChatSyncConfig } from "~~/shared/schemas/server/chatSync";
import {
  getDefaultChatSyncConfig,
  formatPlatformToMCMessage,
  formatMCToPlatformMessage
} from "~~/shared/utils/chatSync";
import type { ApiResponse } from "~~/shared/types";
import { zodToNaiveRules } from "~~/shared/utils/validation";
import type { PageState } from "~~/app/composables/usePageState";

// ==================== 页面配置 ====================
definePageMeta({
  layout: "server-edit"
});

// ==================== 组合式函数和依赖注入 ====================
const { serverData: serverData } = getServerData.value;
const menuOptions: Ref<MenuItem[]> = inject(
  "menuOptions",
  computed(() => [])
);
const registerPageState = inject<(state: PageState) => void>("registerPageState");
const clearPageState = inject<() => void>("clearPageState");
const route = useRoute();
const message = useMessage();

// ==================== 计算属性 ====================
const found = computed(() => {
  const found = menuOptions.value.find((item) => item.key === route.path);
  if (!found) throw new Error(`Menu item not found for path: ${route.path}`);
  return found;
});

const isDirty = computed(
  () =>
    dataState.isSubmitting ||
    (!dataState.isLoading && JSON.stringify(formData.value) !== JSON.stringify(dataState.original.chatSyncConfig))
);
const isAnyLoading = computed(() => dataState.isLoading);

// ==================== 类型定义 ====================
interface DataState {
  data: { serverData: any };
  isLoading: boolean;
  isSubmitting: boolean;
  original: { chatSyncConfig: ChatSyncConfig | null };
}

// ==================== 数据状态 ====================
const dataState = reactive<DataState>({
  data: { serverData: null },
  isLoading: true,
  isSubmitting: false,
  original: { chatSyncConfig: null }
});

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

// ==================== 选项定义 ====================
const targetTypeOptions = [
  { label: "群聊", value: "group" },
  { label: "私聊", value: "private" }
];


const statusFilterOptions = [
  { label: "已启用", value: "enable" },
  { label: "已禁用", value: "disable" }
];

const columns = [
  {
    title: '目标ID',
    key: 'ID',
    width: '40%',
    render(row: any, index: number) {
      return h(NInput, {
        placeholder: '请输入目标ID',
        value: row.groupId,
        onUpdateValue(v) {
          if (filteredTargets.value && filteredTargets.value[index]) {
            filteredTargets.value[index].groupId = v;
          }
        }
      })
    }
  },
  {
    title: '类型',
    key: 'type',
    width: '20%',
    render(row: any, index: number) {
      return h(NSelect, {
        value: row.type,
        options: targetTypeOptions,
        onUpdateValue(v) {
          if (filteredTargets.value && filteredTargets.value[index]) {
            filteredTargets.value[index].type = v;
          }
        }
      })
    }
  },
  {
    title: '状态',
    key: 'enabled',
    width: '20%',
    render(row: any, index: number) {
      return h(NSelect, {
        value: row.enabled === "已启用" ? "enable" : "disable",
        options: statusFilterOptions,
        onUpdateValue(v: string) {
          console.log(row);
          if (filteredTargets.value && filteredTargets.value[index]) {
            filteredTargets.value[index].enabled = (v === 'enable');
          }
        }
      })
    }
  },
  {
    title: '操作',
    key: 'actions',
    render(row: any) {
      return h(
        NButton,
        {
          size: 'small',
          onClick: () => removeTarget(getOriginalIndex(row)),
        },
        { default: () => '删除' }
      )
    }
  }
]

// ==================== 搜索和筛选状态 ====================
const searchText = ref("");
const typeFilter = ref<string | null>(null);
const statusFilter = ref<string | null>(null);

// ==================== 过滤后的目标列表 ====================
const filteredTargets = computed(() => {
  let filtered = formData.value.targets;

  if (searchText.value.trim()) {
    filtered = filtered.filter((target) => target.groupId.toLowerCase().includes(searchText.value.toLowerCase()));
  }

  if (typeFilter.value !== null) {
    filtered = filtered.filter((target) => target.type === typeFilter.value);
  }

  if (statusFilter.value !== null) {
    filtered = filtered.filter((target) => {
      if (statusFilter.value === "enable") return target.enabled === true;
      if (statusFilter.value === "disable") return target.enabled === false;
      return true;
    });
  }

  return filtered;
});

// ==================== 目标管理 ====================
function addTarget() {
  // 检查最后一个 target 的 groupId 是否为空
  const targets = formData.value.targets;
  if (targets.length > 0 && !(targets[targets.length - 1]?.groupId?.trim())) {
    message.warning("你？是不是忘了填上一个点目标 ID？");
    return;
  }
  const newTarget = {
    groupId: "",
    type: "group" as const,
    enabled: true,
  };
  formData.value.targets.push(newTarget);
}

function removeTarget(idx: number) {
  formData.value.targets.splice(idx, 1);
}

function getOriginalIndex(target: any) {
  return formData.value.targets.findIndex((t) => t.groupId === target.groupId && t.type === target.type);
}

const data = computed(() => {
  return filteredTargets.value.map((target) => ({
    groupId: target.groupId,
    type: target.type === "group" ? "群聊" : "私聊",
    enabled: target.enabled ? "已启用" : "已禁用",
    actions: target
  }));
});

// ==================== 模板变量定义 ====================
const mcToPlatformVariables = [
  { label: "玩家名", value: "{playerName}", example: "Steve" },
  { label: "玩家UUID", value: "{playerUUID}", example: "12345678-1234-1234..." },
  { label: "消息内容", value: "{message}", example: "Hello world!" },
  { label: "服务器名", value: "{serverName}", example: serverData && serverData.value ? serverData.value.name : "MyServer" },
  { label: "时间戳", value: "{timestamp}", example: "2024-01-01 12:00:00" }
];

const platformToMcVariables = [
  { label: "平台名", value: "{platform}", example: "QQ" },
  { label: "昵称", value: "{nickname}", example: "Alice" },
  { label: "用户ID", value: "{userId}", example: "123456789" },
  { label: "消息内容", value: "{message}", example: "Hi everyone!" },
  { label: "时间戳", value: "{timestamp}", example: "2024-01-01 12:00:00" }
];

// ==================== 模板预览 ====================
const mcToPlatformPreview = computed(() => {
  return formatMCToPlatformMessage(formData.value.mcToPlatformTemplate, {
    playerName: "Steve",
    playerUUID: "12345678-1234-1234-1234-123456789abc",
    message: "Hello world!",
    serverName: serverData && serverData.value ? serverData.value.name : "MyServer",
    timestamp: Date.now()
  });
});

const platformToMcPreview = computed(() => {
  return formatPlatformToMCMessage(formData.value.platformToMcTemplate, {
    platform: "QQ",
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
    if (!route.params?.["id"]) return;
    try {
      const response = await $fetch<ApiResponse<any>>(`/api/servers/${route.params["id"]}`);
      if (response.code === StatusCodes.OK && response.data) {
        dataState.data.serverData = response.data;
        dataState.original.chatSyncConfig = response.data.chatSyncConfig;
        formData.value = response.data.chatSyncConfig
          ? JSON.parse(JSON.stringify(response.data.chatSyncConfig))
          : getDefaultChatSyncConfig();
      }
    } catch (error) {
      console.error("Failed to refresh server data:", error);
      message.error("刷新服务器数据失败");
    }
  }

  async updateServerChatSyncConfig(serverId: number, chatSyncConfig: ChatSyncConfig): Promise<void> {
    try {
      dataState.isSubmitting = true;
      await $fetch<ApiResponse<ChatSyncConfig>>(`/api/servers/${serverId}/chatSync`, {
        method: "POST",
        body: chatSyncConfig
      });
      dataState.original.chatSyncConfig = JSON.parse(JSON.stringify(chatSyncConfig));
      if (dataState.data.serverData) Object.assign(dataState.data.serverData, { chatSyncConfig });
      message.success("消息同步配置已保存");
    } catch (error) {
      console.error("Submit failed:", error);
      message.error("消息同步配置保存失败");
      throw error;
    } finally {
      dataState.isSubmitting = false;
    }
  }

  async refreshAll(): Promise<void> {
    dataState.isLoading = true;
    await Promise.all([this.refreshServerData()]).finally(() => {
      dataState.isLoading = false;
    });
  }
}

// ==================== 数据管理器实例 ====================
const dataManager = new DataManager();

// ==================== 事件处理函数 ====================
async function handleSubmit() {
  if (!dataState.data.serverData) {
    message.error("服务器数据未加载或无效");
    return;
  }
  const hasChanges = JSON.stringify(formData.value) !== JSON.stringify(dataState.original.chatSyncConfig);
  if (!hasChanges) {
    message.info("没有需要保存的更改");
    return;
  }
  await dataManager.updateServerChatSyncConfig(dataState.data.serverData.id, formData.value);
}

function cancelChanges() {
  if (dataState.original.chatSyncConfig) {
    formData.value = JSON.parse(JSON.stringify(dataState.original.chatSyncConfig));
  } else {
    formData.value = getDefaultChatSyncConfig();
  }
}

// ==================== 生命周期钩子 ====================
onMounted(async () => {
  await dataManager.refreshAll();
  if (registerPageState) {
    registerPageState({
      isDirty: () => isDirty.value,
      save: handleSubmit
    });
  }
});

onUnmounted(() => {
  if (clearPageState) {
    clearPageState();
  }
});
</script>
