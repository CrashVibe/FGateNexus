<template>
  <div>
    <HeaderServer back-button-text="服务器列表" back-path="/" class="mb-4" />
    <n-form ref="formRef" :model="formData" :rules="rules" class="mb-4">
      <div class="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div class="space-y-6">
          <n-card class="h-full" size="small" title="玩家进出事件">
            <n-form-item label="是否启用" path="player_notify">
              <n-switch v-model:value="formData.player_notify" />
            </n-form-item>
            <n-form-item class="mb-2" label="玩家进出时发送的消息" path="join_notify_message">
              <n-input
                v-model:value="formData.join_notify_message"
                maxlength="200"
                placeholder="绑定成功时的反馈消息"
                show-count
              />
              <template #feedback>
                <div class="mt-2 space-y-2">
                  <div class="flex flex-wrap gap-1">
                    <n-tooltip v-for="tag in joinVariables" :key="tag.value" trigger="hover">
                      <template #trigger>
                        <n-tag
                          :type="formData.join_notify_message.includes(tag.value) ? 'primary' : 'default'"
                          class="cursor-pointer"
                          size="small"
                          @click="insertPlaceholder('join_notify_message', tag.value)"
                        >
                          {{ tag.value }}
                        </n-tag>
                      </template>
                      {{ tag.label }} · [{{ tag.example }}]
                    </n-tooltip>
                  </div>
                  <div class="text-sm text-gray-500">
                    预览:
                    <n-text type="success">
                      {{ renderJoinMessage(formData.join_notify_message, "Steve") }}
                    </n-text>
                  </div>
                </div>
              </template>
            </n-form-item>
            <n-form-item class="mb-2" label="玩家离开时发送的消息" path="leave_notify_message">
              <n-input
                v-model:value="formData.leave_notify_message"
                maxlength="200"
                placeholder="绑定成功时的反馈消息"
                show-count
              />
              <template #feedback>
                <div class="mt-2 space-y-2">
                  <div class="flex flex-wrap gap-1">
                    <n-tooltip v-for="tag in leaveVariables" :key="tag.value" trigger="hover">
                      <template #trigger>
                        <n-tag
                          :type="formData.leave_notify_message.includes(tag.value) ? 'primary' : 'default'"
                          class="cursor-pointer"
                          size="small"
                          @click="insertPlaceholder('leave_notify_message', tag.value)"
                        >
                          {{ tag.value }}
                        </n-tag>
                      </template>
                      {{ tag.label }} · [{{ tag.example }}]
                    </n-tooltip>
                  </div>
                  <div class="text-sm text-gray-500">
                    预览:
                    <n-text type="success">
                      {{ renderLeaveMessage(formData.leave_notify_message, "Steve") }}
                    </n-text>
                  </div>
                </div>
              </template>
            </n-form-item>
          </n-card>
        </div>
        <div class="space-y-6">
          <n-card class="h-full" size="small" title="死亡事件">
            <n-form-item label="是否启用" path="player_disappoint_notify">
              <n-switch v-model:value="formData.player_disappoint_notify" />
            </n-form-item>
            <n-form-item class="mb-2" label="玩家死亡时发送的消息" path="death_notify_message">
              <n-input
                v-model:value="formData.death_notify_message"
                maxlength="200"
                placeholder="玩家死亡时发送的消息"
                show-count
              />
              <template #feedback>
                <div class="mt-2 space-y-2">
                  <div class="flex flex-wrap gap-1">
                    <n-tooltip v-for="tag in deathVariables" :key="tag.value" trigger="hover">
                      <template #trigger>
                        <n-tag
                          :type="formData.death_notify_message.includes(tag.value) ? 'primary' : 'default'"
                          class="cursor-pointer"
                          size="small"
                          @click="insertPlaceholder('death_notify_message', tag.value)"
                        >
                          {{ tag.value }}
                        </n-tag>
                      </template>
                      {{ tag.label }} · [{{ tag.example }}]
                    </n-tooltip>
                  </div>
                  <div class="text-sm text-gray-500">
                    预览:
                    <n-text type="success">
                      {{ renderDeathMessage(formData.death_notify_message, "Steve", "掉落") }}
                    </n-text>
                  </div>
                </div>
              </template>
            </n-form-item>
          </n-card>
        </div>
      </div>
    </n-form>
    <n-card size="small" title="目标配置">
      <template #header-extra>
        <n-button size="small" type="primary" @click="addTarget">添加目标</n-button>
      </template>
      <n-data-table
        :columns="columns"
        :data="data"
        :pagination="{
          pageSizes: pageSizes,
          showSizePicker: true
        }"
      >
        <template #empty>
          <n-empty description="暂无目标配置，请添加目标">
            <template #extra>
              <n-button size="medium" type="primary" @click="addTarget">添加目标</n-button>
            </template>
          </n-empty>
        </template>
      </n-data-table>
    </n-card>
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
import { StatusCodes } from "http-status-codes";
import { type FormInst, NButton, NInput, NSelect } from "naive-ui";
import { type NotifyConfig, NotifyConfigSchema, type NotifyTarget } from "~~/shared/schemas/server/notify";
import type { ServerWithStatus } from "~~/shared/schemas/server/servers";
import type { ApiResponse } from "~~/shared/types";
import { renderDeathMessage, renderJoinMessage, renderLeaveMessage } from "~~/shared/utils/template/notify";
import { v4 as uuidv4 } from "uuid";

// ==================== 页面配置 ====================
definePageMeta({
  layout: "server-edit"
});

// ==================== 组合式函数和依赖注入 ====================
const registerPageState = inject<(state: PageState) => void>("registerPageState");
const clearPageState = inject<() => void>("clearPageState");
const route = useRoute();
const message = useMessage();

// ==================== 表单数据和验证 ====================

const formRef = ref<FormInst>();
const formData = ref<NotifyConfig>(getDefaultNotifyConfig());
const rules = zodToNaiveRules(NotifyConfigSchema);

// ==================== 计算属性 ====================

const isDirty = computed(
  () =>
    dataState.isSubmitting ||
    (!dataState.isLoading && JSON.stringify(formData.value) !== JSON.stringify(dataState.original.NotifyConfig))
);
const isAnyLoading = computed(() => dataState.isLoading);

const data = computed(() => {
  return formData.value.targets;
});

// ==================== 类型定义 ====================
interface DataState {
  data: {
    serverData: ServerWithStatus | null;
  };
  isLoading: boolean;
  isSubmitting: boolean;
  original: {
    NotifyConfig: NotifyConfig | null;
  };
}

// ==================== 数据状态 ====================
const dataState = reactive<DataState>({
  data: {
    serverData: null
  },
  isLoading: true,
  isSubmitting: false,
  original: { NotifyConfig: null }
});

// ==================== 模板插入函数 ====================
function insertPlaceholder(
  field: keyof Pick<NotifyConfig, "join_notify_message" | "leave_notify_message" | "death_notify_message">,
  placeholder: string
) {
  const current = formData.value[field] || "";
  formData.value[field] = current + placeholder;
}

const joinVariables = [{ label: "玩家名称", value: "{playerName}", example: "Steve" }];
const leaveVariables = [{ label: "玩家名称", value: "{playerName}", example: "Steve" }];

const deathVariables = [
  { label: "玩家名称", value: "{playerName}", example: "Steve" },
  { label: "死亡原因", value: "{deathMessage}", example: "掉落" }
];

// ==================== 数据管理类 ====================

class DataManager {
  async refreshServerData(): Promise<void> {
    if (!route.params?.["id"]) return;
    try {
      const response = await $fetch<ApiResponse<ServerWithStatus>>(`/api/servers/${route.params["id"]}`);
      if (response.code === StatusCodes.OK && response.data) {
        dataState.data.serverData = response.data;
        dataState.original = { NotifyConfig: response.data.notifyConfig };
        formData.value = JSON.parse(JSON.stringify(response.data.notifyConfig));
      }
    } catch (error) {
      console.error("Failed to refresh server data:", error);
      message.error("刷新服务器数据失败");
    }
  }

  async updateServerNotifyConfig(serverId: number, notifyConfig: NotifyConfig): Promise<void> {
    try {
      dataState.isSubmitting = true;
      await $fetch<ApiResponse<NotifyConfig>>(`/api/servers/${serverId}/notify`, {
        method: "POST",
        body: notifyConfig
      });
      message.success("适配器设置已保存");
      dataState.original.NotifyConfig = notifyConfig;
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

    const hasChanges = JSON.stringify(formData.value) !== JSON.stringify(dataState.original.NotifyConfig);
    if (!hasChanges) {
      message.info("没有需要保存的更改");
      return;
    }

    try {
      await this.updateServerNotifyConfig(dataState.data.serverData.id, formData.value);
      Object.assign(dataState.data.serverData, { notifyConfig: formData.value });
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

// ==================== 数据管理器实例 ====================
const dataManager = new DataManager();

// ==================== 事件处理函数 ====================
async function handleSubmit() {
  await dataManager.handleSubmit();
}

function cancelChanges() {
  if (dataState.original.NotifyConfig) {
    formData.value = JSON.parse(JSON.stringify(dataState.original.NotifyConfig));
  } else {
    formData.value = getDefaultNotifyConfig();
  }
}

function removeTarget(id: string) {
  const index = formData.value.targets.findIndex((target) => target.id === id);
  if (index !== -1) {
    formData.value.targets.splice(index, 1);
  }
}
function addTarget() {
  // 检查最后一个 target 的 groupId 是否为空
  const targets = formData.value.targets;
  if (targets.length > 0 && !targets[targets.length - 1]?.groupId?.trim()) {
    message.warning("你？是不是忘了填上一个点目标 ID？");
    return;
  }
  const newTarget: NotifyTarget = {
    groupId: "",
    type: "group",
    enabled: true,
    id: uuidv4()
  };
  formData.value.targets.push(newTarget);
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
// ==================== 定义 ====================
const targetTypeOptions = [
  { label: "群聊", value: "group" },
  { label: "私聊", value: "private" }
];

const statusFilterOptions = [
  { label: "已启用", value: "enable" },
  { label: "已禁用", value: "disable" }
];

const pageSizes = [
  {
    label: "10 每页",
    value: 10
  },
  {
    label: "20 每页",
    value: 20
  },
  {
    label: "30 每页",
    value: 30
  },
  {
    label: "40 每页",
    value: 40
  }
];

const columns = [
  {
    title: "目标ID",
    key: "ID",
    width: "40%",
    render(row: NotifyTarget, index: number) {
      return h(NInput, {
        placeholder: "请输入目标ID",
        value: row.groupId,
        onUpdateValue(v) {
          if (formData.value.targets[index]) {
            formData.value.targets[index].groupId = v;
          }
        }
      });
    }
  },
  {
    title: "类型",
    key: "type",
    width: "20%",
    render(row: NotifyTarget, index: number) {
      return h(NSelect, {
        value: row.type,
        options: targetTypeOptions,
        onUpdateValue(v) {
          if (formData.value.targets[index]) {
            formData.value.targets[index].type = v;
          }
        }
      });
    }
  },
  {
    title: "状态",
    key: "enabled",
    width: "20%",
    render(row: NotifyTarget, index: number) {
      return h(NSelect, {
        value: row.enabled ? "enable" : "disable",
        options: statusFilterOptions,
        onUpdateValue(v: string) {
          console.log(row);
          if (formData.value.targets[index]) {
            formData.value.targets[index].enabled = v === "enable";
          }
        }
      });
    }
  },
  {
    title: "操作",
    key: "actions",
    render(row: NotifyTarget) {
      console.log(row);
      return h(
        NButton,
        {
          size: "small",
          onClick: () => removeTarget(row.id!)
        },
        { default: () => "删除" }
      );
    }
  }
];
</script>
