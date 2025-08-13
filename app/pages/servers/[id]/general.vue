<template>
  <div>
    <HeaderServer
      title="基础设置"
      :server-name="dataState.data.serverData?.name || ''"
      back-button-text="服务器列表"
      back-path="/"
      :desc="desc"
      class="mb-4"
    />
    <AlertUnsave
      :show="isDirty"
      :saving="dataState.isSubmitting"
      message="您有未保存的配置更改"
      class="mb-4"
      @discard="cancelChanges"
      @save="handleSubmit"
    />
    <n-form :model="formData" :rules="rules">
      <n-grid :cols="isMobile ? 1 : '600:2 1600:3'">
        <n-gi>
          <n-card title="Bot 实例" size="small" class="h-full cursor-pointer" hoverable embedded>
            <n-form-item label="Bot 实例" path="adapterId">
              <n-select
                v-model:value="formData.adapterId"
                :options="adapterOptions"
                placeholder="请选择 Bot 实例"
                filterable
                clearable
                style="width: 100%"
              />
            </n-form-item>
          </n-card>
        </n-gi>
      </n-grid>
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
import type { SelectMixedOption } from "naive-ui/es/select/src/interface";
import type { MenuItem } from "~/layouts/serverEdit.vue";
import type { AdapterWithStatus } from "~~/shared/schemas/adapter";
import { chooseAdapterSchema, type ChooseAdapter, type ServerWithStatus } from "~~/shared/schemas/server/servers";
import type { ApiResponse } from "~~/shared/types";
import { zodToNaiveRules } from "~~/shared/utils/validation";

// ==================== 页面配置 ====================
definePageMeta({
  layout: "server-edit"
});

// ==================== 组合式函数和依赖注入 ====================
const menuOptions: Ref<MenuItem[]> = inject(
  "menuOptions",
  computed(() => [])
);
const route = useRoute();
const message = useMessage();

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
  async fetchAdapterList(): Promise<void> {
    try {
      const response = await $fetch<ApiResponse<AdapterWithStatus[]>>("/api/adapter");
      if (response.code === StatusCodes.OK && response.data) {
        dataState.data.adapterList = response.data;
      } else {
        throw new Error("获取适配器列表失败");
      }
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
});

// ==================== 计算属性 ====================
const desc = computed(() => {
  const found = menuOptions.value.find((item) => item.key === route.path);
  if (found) {
    return String(found.desc);
  }
});

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
