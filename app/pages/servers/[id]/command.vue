<template>
  <div>
    <HeaderServer class="mb-4" />

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
        :scroll-x="600"
      >
        <template #empty>
          <n-empty description="暂无目标配置，请添加目标">
            <template #extra>
              <n-button size="medium" type="primary" @click="addTarget">添加目标</n-button>
            </template>
          </n-empty>
        </template>
      </n-data-table>

      <!-- 抽屉 -->
      <n-drawer v-model:show="drawerVisible" width="500">
        <drawer-command
          v-if="selectedTarget"
          :adapter-type="dataState.data.adapterData?.type"
          :target="selectedTarget"
          @save="handleTargetSave"
        />
      </n-drawer>
    </n-card>

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

<script lang="tsx" setup>
// ==================== 导入 ====================
import { StatusCodes } from "http-status-codes";
import { NButton, NInput, NSelect } from "naive-ui";
import type { CommandConfig, CommandTarget } from "~~/shared/schemas/server/command";
import { getDefaultCommandConfig } from "~~/shared/utils/command";
import type { ApiResponse } from "~~/shared/types";
import type { PageState } from "~~/app/composables/usePageState";
import type { ServerWithStatus } from "~~/shared/schemas/server/servers";
import { v4 as uuidv4 } from "uuid";
import type { AdapterWithStatus } from "~~/shared/schemas/adapter";

// ==================== 页面配置 ====================
definePageMeta({
  layout: "server-edit"
});

// ==================== 组合式函数和依赖注入 ====================
const registerPageState = inject<(state: PageState) => void>("registerPageState");
const clearPageState = inject<() => void>("clearPageState");
const route = useRoute();
const message = useMessage();

// ==================== 计算属性 ====================

const data = computed(() => {
  return formData.value.targets;
});

const isDirty = computed(
  () =>
    dataState.isSubmitting ||
    (!dataState.isLoading && JSON.stringify(formData.value) !== JSON.stringify(dataState.original.commandConfig))
);
const isAnyLoading = computed(() => dataState.isLoading);

// ==================== 类型定义 ====================
interface DataState {
  data: {
    serverData: ServerWithStatus | null;
    adapterData: AdapterWithStatus | null;
  };
  isLoading: boolean;
  isSubmitting: boolean;
  original: { commandConfig: CommandConfig | null };
}

// ==================== 数据状态 ====================
const dataState = reactive<DataState>({
  data: {
    serverData: null,
    adapterData: null
  },
  isLoading: true,
  isSubmitting: false,
  original: { commandConfig: null }
});

const formData = ref<CommandConfig>(getDefaultCommandConfig());

// ==================== 选项定义 ====================
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
    render(row: CommandTarget, index: number) {
      return h(NInput, {
        placeholder: "请输入目标ID",
        value: row.groupId,
        onUpdateValue(v) {
          if (formData.value && formData.value.targets[index]) {
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
    render(row: CommandTarget, index: number) {
      return h(NSelect, {
        value: row.type,
        options: targetTypeOptions,
        onUpdateValue(v) {
          if (formData.value && formData.value.targets[index]) {
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
    render(row: CommandTarget, index: number) {
      return h(NSelect, {
        value: row.enabled ? "enable" : "disable",
        options: statusFilterOptions,
        onUpdateValue(v: string) {
          console.log(row);
          if (formData.value && formData.value.targets[index]) {
            formData.value.targets[index].enabled = v === "enable";
          }
        }
      });
    }
  },
  {
    title: "操作",
    key: "actions",
    render(row: CommandTarget) {
      const id = row.id;
      return (
        <div class={"flex gap-2"}>
          <NButton size="small" onClick={() => editTarget(row)}>
            编辑
          </NButton>
          <NButton size="small" onClick={() => id && removeTargetById(id)}>
            删除
          </NButton>
        </div>
      );
    }
  }
];

// ==================== 目标管理 ====================
function addTarget() {
  // 检查最后一个 target 的 groupId 是否为空
  const targets = formData.value.targets;
  if (targets.length > 0 && !targets[targets.length - 1]?.groupId?.trim()) {
    message.warning("你？是不是忘了填上一个点目标 ID？");
    return;
  }
  const newTarget: CommandTarget = {
    groupId: "",
    type: "group",
    enabled: true,
    permissions: [],
    prefix: "/",
    id: uuidv4()
  };
  formData.value.targets.push(newTarget);
}

function handleTargetSave(data: CommandTarget) {
  formData.value.targets[formData.value.targets.findIndex((t) => t.id === data.id)] = data;
  drawerVisible.value = false;
}

const selectedTarget = ref<CommandTarget | null>(null);
const drawerVisible = ref(false);

function editTarget(target: CommandTarget) {
  selectedTarget.value = target;
  drawerVisible.value = true;
}

function removeTargetById(id: string) {
  const idx = formData.value.targets.findIndex((t) => t.id === id);
  if (idx !== -1) formData.value.targets.splice(idx, 1);
}

// ==================== 数据管理类 ====================
class DataManager {
  async refreshServerData(): Promise<void> {
    if (!route.params?.["id"]) return;
    try {
      const response = await $fetch<ApiResponse<ServerWithStatus>>(`/api/servers/${route.params["id"]}`);
      if (response.code === StatusCodes.OK && response.data) {
        dataState.data.serverData = response.data;
        dataState.original.commandConfig = response.data.commandConfig;
        formData.value = JSON.parse(JSON.stringify(response.data.commandConfig));
        if (response.data.adapterId) {
          const adapterResponse = await $fetch<ApiResponse<AdapterWithStatus>>(
            `/api/adapter/${response.data.adapterId}`
          );
          if (adapterResponse.code === StatusCodes.OK && adapterResponse.data) {
            dataState.data.adapterData = adapterResponse.data;
          }
        }
      }
    } catch (error) {
      console.error("Failed to refresh server data:", error);
      message.error("刷新服务器数据失败");
    }
  }

  async updateServerCommandConfig(serverId: number, commandConfig: CommandConfig): Promise<void> {
    // 检查 groupId 与 type 组合是否有重复
    const comboMap = new Map<string, number[]>();
    commandConfig.targets.forEach((t, idx) => {
      const key = `${(t.groupId || "").trim()}::${t.type || ""}`;
      const arr = comboMap.get(key) ?? [];
      arr.push(idx);
      comboMap.set(key, arr);
    });
    const duplicates = [...comboMap.entries()].filter(([, idxs]) => idxs.length > 1);
    if (duplicates.length > 0) {
      const dupMsg = duplicates
        .map(([key, idxs]) => {
          const [groupId, type] = key.split("::");
          return `目标ID "${groupId}" 与 类型 "${type === "group" ? "群聊" : "私聊"}" 重复 ${idxs.length} 次`;
        })
        .join("； ");
      message.warning(`发现重复目标配置：${dupMsg}`);
      return;
    }

    try {
      dataState.isSubmitting = true;
      await $fetch<ApiResponse<CommandConfig>>(`/api/servers/${serverId}/command`, {
        method: "POST",
        body: commandConfig
      });
      dataState.original.commandConfig = JSON.parse(JSON.stringify(commandConfig));
      if (dataState.data.serverData) Object.assign(dataState.data.serverData, { chatSyncConfig: commandConfig });
      message.success("远程指令配置已保存");
    } catch (error) {
      console.error("Submit failed:", error);
      message.error("远程指令配置保存失败");
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
  const hasChanges = JSON.stringify(formData.value) !== JSON.stringify(dataState.original.commandConfig);
  if (!hasChanges) {
    message.info("没有需要保存的更改");
    return;
  }
  await dataManager.updateServerCommandConfig(dataState.data.serverData.id, formData.value);
}

function cancelChanges() {
  if (dataState.original.commandConfig) {
    formData.value = JSON.parse(JSON.stringify(dataState.original.commandConfig));
  } else {
    formData.value = getDefaultCommandConfig();
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
