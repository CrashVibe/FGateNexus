<script lang="ts" setup>
import { cloneDeep } from "lodash-es";
import type { z } from "zod";

import type {
  AdaptersWithStatus,
  AdapterWithStatus,
} from "#shared/model/adapter";
import { AdapterAPI, AdapterType } from "#shared/model/adapter";
import CardAdapter from "@/components/card/adapter.vue";
import PageHeader from "@/components/header/page-header.vue";
import { AdapterData } from "~/composables/api";

// 选取适配器组件
const adapterComponentMap: Record<AdapterType, Component> = {
  [AdapterType.Onebot]: CardAdapter,
};
const getAdapterComponent = (adapterType: AdapterType): Component =>
  adapterComponentMap[adapterType];

const formData = ref<Partial<z.infer<typeof AdapterAPI.POST.request>>>({
  config: undefined,
  name: undefined,
  type: undefined,
});
const isSubmitting = ref(false);
const toast = useToast();
const showModal = ref(false);

const openModal = () => {
  formData.value = {
    config: undefined,
    name: undefined,
    type: undefined,
  };
  showModal.value = true;
};

// 适配器列表逻辑
const adapterList = ref<AdaptersWithStatus>([]);
const isLoadingList = ref(false);

const fetchAdapterList = async () => {
  try {
    isLoadingList.value = true;
    adapterList.value = await AdapterData.gets();
  } catch (error) {
    console.error("Failed to fetch adapter list:", error);
    toast.add({ color: "error", title: "获取适配器列表失败" });
  } finally {
    isLoadingList.value = false;
  }
};

const handleSubmitClick = async () => {
  if (isSubmitting.value) {
    return;
  }

  try {
    isSubmitting.value = true;

    if (formData.value.config) {
      const parsed = AdapterAPI.POST.request.parse(formData.value);
      await AdapterData.post({
        config: parsed.config,
        name: parsed.name,
        type: parsed.type,
      });
      toast.add({ color: "success", title: "Bot 实例创建成功" });
      showModal.value = false;
      await fetchAdapterList();
    }
  } catch (error) {
    console.error("Submit failed:", error);
    toast.add({ color: "error", title: "保存配置失败，请稍后再试" });
  } finally {
    isSubmitting.value = false;
  }
};

onMounted(() => {
  fetchAdapterList();
});

// 组件点击事件 emit
const showDrawer = ref(false);
const selectedAdapter = ref<AdapterWithStatus | null>(null);

const handleChildClick = (adapterID: number) => {
  const adapter = adapterList.value.find((item) => item.id === adapterID);
  if (adapter) {
    selectedAdapter.value = adapter;
    showDrawer.value = true;
  }
};

// 修改
const handleSave = async (
  adapterID: number,
  adapter: z.infer<typeof AdapterAPI.POST.request>,
) => {
  try {
    await AdapterData.put(adapterID, adapter);
  } catch {
    toast.add({ color: "error", title: "操作失败，请检查后端日志" });
    return;
  }
  toast.add({ color: "success", title: "Bot 实例更新成功" });
  showDrawer.value = false;
  await fetchAdapterList();
};

// 删除
const handleDelete = async (adapterID: number) => {
  try {
    await AdapterData.delete(adapterID);
  } catch {
    toast.add({ color: "error", title: "操作失败，请检查后端日志" });
    return;
  }
  toast.add({ color: "success", title: "Bot 实例删除成功" });
  showDrawer.value = false;
  await fetchAdapterList();
};

// 更改
const handleToggle = async (adapterID: number, enabled: boolean) => {
  try {
    await AdapterData.postToggle(adapterID, { enabled });
  } catch {
    toast.add({ color: "error", title: "操作失败，请检查后端日志" });
    return;
  }
  toast.add({
    color: "success",
    title: `Bot 实例已${enabled ? "启用" : "禁用"}成功`,
  });
  showDrawer.value = false;
  await fetchAdapterList();
};
</script>
<template>
  <div class="h-full">
    <UDashboardPanel
      class="scrollbar-custom h-full"
      :ui="{ body: 'p-0 sm:p-0 overflow-y-auto overscroll-none' }"
    >
      <template #header>
        <PageHeader
          title="Bot 实例列表"
          description="管理多个 Bot 实例，点击进入详细配置。"
        >
          <template #actions>
            <UButton icon="i-lucide-plus" @click="openModal"
              >创建新 Bot 实例</UButton
            >
          </template>
        </PageHeader>
      </template>
      <template #body>
        <UContainer class="py-8">
          <!-- 创建 Bot 实例弹窗 -->
          <UModal v-model:open="showModal" title="创建 Bot 实例">
            <template #body>
              <selector-bot v-model="formData" />
            </template>
            <template #footer>
              <div class="flex justify-end gap-2">
                <UButton
                  color="neutral"
                  variant="subtle"
                  :disabled="isSubmitting"
                  @click="showModal = false"
                >
                  取消
                </UButton>
                <UButton
                  :loading="isSubmitting"
                  :disabled="isSubmitting"
                  @click="handleSubmitClick"
                >
                  确认创建
                </UButton>
              </div>
            </template>
          </UModal>

          <!-- 空状态 -->
          <div
            v-if="adapterList.length === 0 && !isLoadingList"
            class="mt-10 flex flex-col items-center gap-4 text-center"
          >
            <p class="text-muted text-sm">
              暂无 Bot 实例，请先创建一个 Bot 实例
            </p>
            <UButton icon="i-lucide-plus" @click="openModal"
              >创建新 Bot 实例</UButton
            >
          </div>

          <!-- 适配器卡片列表 -->
          <div
            v-else
            class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4"
          >
            <component
              :is="getAdapterComponent(adapter.type)"
              v-for="(adapter, index) in adapterList"
              :key="adapter.id"
              :adapter="adapter"
              :data-index="index"
              @click="handleChildClick"
            />
          </div>

          <!-- 抽屉 -->
          <USlideover
            v-model:open="showDrawer"
            side="right"
            title="配置修改"
            description="修改 Bot 实例配置"
          >
            <template #body>
              <drawer-bot
                v-if="selectedAdapter"
                :adapter="cloneDeep(selectedAdapter)"
                @delete="handleDelete"
                @save="handleSave"
                @toggle="handleToggle"
              />
            </template>
          </USlideover>
        </UContainer>
      </template>
    </UDashboardPanel>
  </div>
</template>
