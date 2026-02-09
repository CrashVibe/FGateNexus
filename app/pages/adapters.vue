<script lang="ts" setup>
import { AddCircleOutline, RefreshOutline } from "@vicons/ionicons5";
import type { FormInst } from "naive-ui";
import { AdapterAPI, AdapterType, type AdaptersWithStatus, type AdapterWithStatus } from "~~/shared/schemas/adapter";
import { CardAdapter } from "#components";
import { isMobile } from "#imports";
import { AdapterData } from "~/composables/api";
import type z from "zod";
import { cloneDeep } from "lodash-es";

// 选取适配器组件
const adapterComponentMap: Record<AdapterType, Component> = {
  [AdapterType.Onebot]: CardAdapter
};
function getAdapterComponent(adapterType: AdapterType): Component {
  return adapterComponentMap[adapterType];
}

const formRef = ref<FormInst>();

const formData = ref<Partial<z.infer<typeof AdapterAPI.POST.request>>>({
  type: undefined,
  config: undefined,
  name: undefined
});
const isSubmitting = ref(false);
const message = useMessage();
const showModal = ref(false);

function openModal() {
  showModal.value = true;
  formData.value = {
    type: undefined,
    name: undefined,
    config: undefined
  };
}

async function handleSubmitClick() {
  if (isSubmitting.value) return;

  try {
    isSubmitting.value = true;
    try {
      await formRef.value?.validate();
    } catch {
      isSubmitting.value = false;
      return;
    }

    if (formData.value.config) {
      const parsed = AdapterAPI.POST.request.parse(formData.value);

      await AdapterData.post({
        type: parsed.type,
        config: parsed.config,
        name: parsed.name
      });

      message.success("Bot 实例创建成功");
      showModal.value = false;
      await fetchAdapterList();
    }
  } catch (error) {
    console.error("Submit failed:", error);
    message.error("保存配置失败，请稍后再试");
  } finally {
    isSubmitting.value = false;
  }
}

// 适配器列表逻辑
const adapterList = ref<AdaptersWithStatus>([]);
const isLoadingList = ref(false);

async function fetchAdapterList() {
  try {
    isLoadingList.value = true;
    const adapter_data = await AdapterData.gets();
    adapterList.value = adapter_data;
  } catch (error) {
    console.error("Failed to fetch server list:", error);
    message.error("获取适配器列表失败");
  } finally {
    isLoadingList.value = false;
  }
}

async function handleRefresh() {
  await fetchAdapterList();
}

onMounted(() => {
  fetchAdapterList();
});

// 组件点击事件 emit
const showDrawer = ref(false);
const selectedAdapter = ref<AdapterWithStatus | null>(null);

function handleChildClick(adapterID: number) {
  const adapter = adapterList.value.find((adapter) => adapter.id === adapterID);
  if (adapter) {
    selectedAdapter.value = adapter;
    showDrawer.value = true;
  }
}

// 修改
async function handleSave(adapterID: number, adapter: z.infer<typeof AdapterAPI.POST.request>) {
  try {
    await AdapterData.put(adapterID, adapter);
  } catch {
    message.error("操作失败，请检查后端日志");
    return;
  }
  message.success("Bot 实例更新成功");
  showDrawer.value = false;
  await fetchAdapterList();
}

// 删除
async function handleDelete(adapterID: number) {
  try {
    await AdapterData.delete(adapterID);
  } catch {
    message.error("操作失败，请检查后端日志");
    return;
  }
  message.success("Bot 实例删除成功");
  showDrawer.value = false;
  await fetchAdapterList();
}

// 更改
async function handleToggle(adapterID: number, enabled: boolean) {
  try {
    await AdapterData.postToggle(adapterID, {
      enabled
    });
  } catch {
    message.error("操作失败，请检查后端日志");
    return;
  }

  message.success(`Bot 实例已${enabled ? "启用" : "禁用"}成功`);
  showDrawer.value = false;
  await fetchAdapterList();
}
</script>
<template>
  <div class="flex h-full flex-col gap-3">
    <!-- head -->
    <div>
      <!-- text 区 -->
      <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <n-text class="flex flex-col gap-2" strong>
          <h1 class="text-2xl sm:text-3xl">Bot 实例列表</h1>
          <p class="text-sm text-gray-400 sm:text-base">管理多个 Bot 实例，点击进入详细配置。</p>
        </n-text>
        <div class="flex flex-wrap gap-2 sm:gap-3">
          <n-button :loading="isLoadingList" size="large" strong @click="handleRefresh">
            刷新列表
            <template #icon>
              <n-icon :component="RefreshOutline" />
            </template>
          </n-button>
          <n-button ghost size="large" type="primary" @click="openModal">
            创建新 Bot 实例
            <template #icon>
              <n-icon :component="AddCircleOutline" />
            </template>
          </n-button>
        </div>
      </div>
    </div>
    <!-- modal 创建区 -->
    <div>
      <n-modal v-model:show="showModal" class="w-[90vw] max-w-150" preset="card" title="创建 Bot 实例">
        <selector-bot ref="botSelectorRef" v-model="formData" />
        <template #action>
          <div class="flex justify-end gap-2">
            <n-button :disabled="isSubmitting" @click="showModal = false">取消</n-button>
            <n-button :disabled="isSubmitting" :loading="isSubmitting" ghost type="primary" @click="handleSubmitClick">
              确认创建
            </n-button>
          </div>
        </template>
      </n-modal>
    </div>
    <!-- Content -->
    <div class="flex-1">
      <n-empty v-if="adapterList.length === 0" class="mt-6 sm:mt-10" description="暂无 Bot 实例，请先创建一个 Bot 实例">
        <template #extra>
          <n-button size="medium" type="primary" @click="openModal">
            创建新 Bot 实例
            <template #icon>
              <n-icon :component="AddCircleOutline" />
            </template>
          </n-button>
        </template>
      </n-empty>
      <n-grid :cols="isMobile ? 1 : '600:2 1100:3 1600:4'" x-gap="16" y-gap="16">
        <n-gi v-for="(adapter, index) in adapterList || []" :key="adapterList.indexOf(adapter)">
          <component
            :is="getAdapterComponent(adapter.type)"
            :adapter="adapter"
            :data-index="index"
            @click="handleChildClick"
          />
        </n-gi>
      </n-grid>
    </div>
    <!-- 抽屉 -->
    <n-drawer v-model:show="showDrawer" width="500">
      <drawer-bot
        v-if="selectedAdapter"
        :adapter="cloneDeep(selectedAdapter)"
        @delete="handleDelete"
        @save="handleSave"
        @toggle="handleToggle"
      />
    </n-drawer>
  </div>
</template>
