<template>
  <div>
    <HeaderServer class="mb-4" />
    <n-form :model="formData" :rules="rules">
      <n-grid :cols="isMobile ? 1 : '600:2 1600:3'" x-gap="16" y-gap="16">
        <n-gi>
          <n-card class="h-full cursor-pointer" embedded hoverable size="small" title="基础操作">
            <!-- 删除 -->
            <n-button type="error" @click="handleDelete">删除</n-button>
          </n-card>
        </n-gi>
        <n-gi>
          <n-card class="h-full cursor-pointer" embedded hoverable size="small" title="Bot 实例">
            <n-form-item label="Bot 实例" path="adapterId">
              <n-select
                v-model:value="formData.adapterId"
                :options="adapterOptions"
                clearable
                filterable
                placeholder="请选择 Bot 实例"
                style="width: 100%"
              />
            </n-form-item>
          </n-card>
        </n-gi>
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
// ==================== 导入 ====================
import { StatusCodes } from "http-status-codes";
import type { SelectMixedOption } from "naive-ui/es/select/src/interface";
import type { AdapterWithStatus } from "~~/shared/schemas/adapter";
import { type ChooseAdapter, chooseAdapterSchema, type ServerWithStatus } from "~~/shared/schemas/server/servers";
import type { ApiResponse } from "~~/shared/types";
import { zodToNaiveRules } from "~~/shared/utils/validation";

// ==================== 页面配置 ====================
definePageMeta({
  layout: "server-edit"
});

// ==================== 组合式函数和依赖注入 ====================
const registerPageState = inject<(state: PageState) => void>("registerPageState");
const clearPageState = inject<() => void>("clearPageState");
const route = useRoute();
const message = useMessage();
const router = useRouter();
// ==================== 类型定义 ====================
interface DataState {
  data: {
    adapterList: AdapterWithStatus[];
    serverData: ServerWithStatus | null;
  };
  isLoading: boolean;
  isSubmitting: boolean;
  original: {
    adapterId: number | null;
  };
}

// ==================== 数据状态 ====================
const dataState = reactive<DataState>({
  data: {
    adapterList: [],
    serverData: null
  },
  isLoading: true,
  isSubmitting: false,
  original: { adapterId: null }
});

// ==================== 数据管理类 ====================
class DataManager {
  async handleDelete() {
    if (!dataState.data.serverData) {
      message.error("服务器数据未加载或无效");
      return;
    }

    try {
      await $fetch<ApiResponse<void>>(`/api/servers/${dataState.data.serverData.id}`, {
        method: "DELETE"
      });
      message.success("服务器已删除");
      dataState.data.serverData = null;
      router.push("/");
    } catch (error) {
      console.error("Delete failed:", error);
      message.error("删除服务器失败");
    }
  }

  async fetchAdapterList(): Promise<void> {
    try {
      const response = await $fetch<ApiResponse<AdapterWithStatus[]>>("/api/adapter");
      if (response.code !== StatusCodes.OK || !response.data) {
        message.error(response.message);
        return;
      }
      dataState.data.adapterList = response.data;
    } catch (error) {
      console.error("Failed to fetch adapter list:", error);
      message.error("获取适配器列表失败");
      throw error;
    }
  }

  async refreshServerData(): Promise<void> {
    if (!route.params?.["id"]) return;
    try {
      const response = await $fetch<ApiResponse<ServerWithStatus>>(`/api/servers/${route.params["id"]}`);
      if (response.code === StatusCodes.OK && response.data) {
        dataState.data.serverData = response.data;
        dataState.original = { adapterId: response.data.adapterId };
      }
    } catch (error) {
      console.error("Failed to refresh server data:", error);
      message.error("刷新服务器数据失败");
    }
  }

  async updateServerAdapter(serverId: number, adapterData: ChooseAdapter): Promise<void> {
    try {
      dataState.isSubmitting = true;
      await $fetch<ApiResponse<ChooseAdapter>>(`/api/servers/${serverId}/general/adapter`, {
        method: "POST",
        body: adapterData
      });
      message.success("适配器设置已保存");
      dataState.original = { ...adapterData };
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

    const hasChanges = formData.value.adapterId !== dataState.original.adapterId;
    if (!hasChanges) {
      message.info("没有需要保存的更改");
      return;
    }

    try {
      await this.updateServerAdapter(dataState.data.serverData.id, formData.value);
      Object.assign(dataState.data.serverData, { adapterId: formData.value.adapterId });
      await this.refreshAll();
    } catch (error) {
      console.error("Submit failed:", error);
    }
  }

  async refreshAll(): Promise<void> {
    dataState.isLoading = true;
    await Promise.all([this.fetchAdapterList(), this.refreshServerData()]).finally(() => {
      dataState.isLoading = false;
    });
  }
}

// ==================== 数据管理器实例 ====================
const dataManager = new DataManager();

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

// ==================== 计算属性 ====================
const adapterOptions = computed<SelectMixedOption[]>(() =>
  dataState.data.adapterList.map((adapter) => ({
    label: `#${adapter.id} - ${adapter.type} [${adapter.isOnline ? "在线" : "离线"}${adapter.enabled ? "" : " · 已禁用"}]`,
    value: adapter.id
  }))
);

const isAnyLoading = computed(() => dataState.isLoading);

const isDirty = computed(
  () => dataState.isSubmitting || (!dataState.isLoading && formData.value.adapterId !== dataState.original.adapterId)
);

// ==================== 表单数据和验证 ====================
const formData = ref<ChooseAdapter>({ adapterId: null });
const rules = zodToNaiveRules(chooseAdapterSchema);

// ==================== 事件处理函数 ====================
async function handleSubmit() {
  await dataManager.handleSubmit();
}

function cancelChanges() {
  formData.value = { ...dataState.original };
}

async function handleDelete() {
  await dataManager.handleDelete();
}

// ==================== 监听器 ====================
watch(
  () => dataState.data.serverData,
  (newServerData) => {
    if (newServerData) {
      formData.value = { adapterId: newServerData.adapterId };
      dataState.original = { adapterId: newServerData.adapterId };
    }
  },
  { immediate: true }
);
</script>
