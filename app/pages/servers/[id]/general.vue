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
          <LoadingState v-if="!formData" />

          <template v-else>
            <div
              class="grid gap-4"
              :class="isMobile ? 'grid-cols-1' : 'grid-cols-2'"
            >
              <UPageCard
                variant="outline"
                title="基础设置"
                description="修改服务器基础信息"
              >
                <UFormField label="服务器名字" name="name">
                  <UInput
                    v-model="formData.name"
                    class="w-full"
                    placeholder="请输入服务器名称"
                  />
                </UFormField>
                <UFormField label="Token" name="token">
                  <UInput
                    v-model="formData.token"
                    class="w-full"
                    placeholder="请输入服务器 Token"
                  />
                </UFormField>
              </UPageCard>

              <UPageCard
                variant="outline"
                title="Bot 实例"
                description="为此服务器绑定一个 Bot 实例"
              >
                <UFormField name="adapterId">
                  <div class="flex w-full items-center gap-2">
                    <USelect
                      v-model="selectedAdapterId"
                      :items="adapterOptions"
                      class="flex-1"
                      searchable
                      placeholder="请选择 Bot 实例"
                    />
                    <UButton
                      v-if="selectedAdapterId !== undefined"
                      color="neutral"
                      variant="ghost"
                      icon="i-lucide-x"
                      size="sm"
                      aria-label="清除选择"
                      @click="selectedAdapterId = undefined"
                    />
                  </div>
                </UFormField>
              </UPageCard>

              <UPageCard
                variant="outline"
                title="基础操作"
                description="危险操作，请谨慎"
              >
                <UButton
                  color="error"
                  variant="subtle"
                  icon="i-lucide-trash-2"
                  @click="showDeleteModal = true"
                  >删除服务器
                </UButton>
              </UPageCard>
            </div>

            <USeparator class="my-4" />
            <div class="flex justify-end gap-2">
              <UButton
                color="neutral"
                variant="subtle"
                :disabled="!isDirty"
                :loading="isAnyLoading"
                @click="cancelChanges"
                >取消</UButton
              >
              <UButton
                :disabled="!isDirty"
                :loading="isAnyLoading"
                @click="handleSubmit"
                >保存配置</UButton
              >
            </div>
          </template>
        </UContainer>

        <UModal v-model:open="showDeleteModal" title="确认删除">
          <template #body>
            <p class="text-muted text-sm">
              确定要删除此服务器吗？删除后将无法恢复。
            </p>
          </template>
          <template #footer>
            <div class="flex justify-end gap-2">
              <UButton
                color="neutral"
                variant="subtle"
                @click="showDeleteModal = false"
                >取消</UButton
              >
              <UButton
                color="error"
                :loading="isDeleting"
                @click="confirmDelete"
                >确认删除</UButton
              >
            </div>
          </template>
        </UModal>
      </template>
    </UDashboardPanel>
  </div>
</template>

<script lang="ts" setup>
import { isEqual } from "lodash-es";
import type { z } from "zod";

import { GeneralAPI } from "#shared/model/server/api";
import type { ServerWithStatus } from "#shared/model/server/schema/servers";
import ServerHeader from "@/components/header/server-header.vue";
import { useIsMobile } from "@/composables/is-mobile";
import { AdapterData, GeneralData, ServerData } from "~/composables/api";

const isMobile = useIsMobile();

definePageMeta({
  layout: "default",
});

const { setPageState, clearPageState } = usePageStateStore();
const route = useRoute();
const router = useRouter();
const toast = useToast();

const loadingMap = reactive({
  isLoading: true,
  isSubmitting: false,
});
const isAnyLoading = computed(() => Object.values(loadingMap).some(Boolean));
const isDeleting = ref(false);
const showDeleteModal = ref(false);

const adapterOptions = ref<{ label: string; value: number }[]>([]);
let serverData: ServerWithStatus | null = null;

const formData = ref<z.infer<typeof GeneralAPI.PATCH.request> | null>(null);
const original = ref<z.infer<typeof GeneralAPI.PATCH.request> | null>(null);
const isDirty = computed(() => {
  if (!formData.value || !original.value) {
    return false;
  }

  return !isEqual(formData.value, original.value);
});

const selectedAdapterId = computed({
  get: () => formData.value?.adapterId ?? undefined,
  set: (v: number | undefined) => {
    if (!formData.value) {
      return;
    }
    formData.value.adapterId = v ?? null;
  },
});

const confirmDelete = async () => {
  isDeleting.value = true;
  try {
    await ServerData.delete(Number(serverData?.id ?? route.params["id"]));
    toast.add({ color: "success", title: "服务器已删除～" });
    showDeleteModal.value = false;
    serverData = null;
    await router.push("/");
  } catch (error) {
    console.error("Delete failed:", error);
    toast.add({ color: "error", title: "删除服务器失败" });
  } finally {
    isDeleting.value = false;
  }
};

const refreshAll = async (): Promise<void> => {
  if (!route.params["id"]) {
    loadingMap.isLoading = false;
    return;
  }
  loadingMap.isLoading = true;
  try {
    const [adapterData, serverDataResult] = await Promise.all([
      AdapterData.gets(),
      ServerData.get(Number(route.params["id"])),
    ]);

    serverData = serverDataResult;

    adapterOptions.value = adapterData.map((adapter) => ({
      label: `#${adapter.id} - ${adapter.type} [${adapter.isOnline ? "在线" : "离线"}${adapter.enabled ? "" : " · 已禁用"}]`,
      value: adapter.id,
    }));

    formData.value = {
      adapterId: serverDataResult.adapterId,
      name: serverDataResult.name,
      token: serverDataResult.token,
    };
    original.value = { ...formData.value };
  } catch (error) {
    console.error("Refresh failed:", error);
    toast.add({ color: "error", title: "加载数据失败" });
  } finally {
    loadingMap.isLoading = false;
  }
};

const handleSubmit = async (): Promise<void> => {
  if (!formData.value) {
    return;
  }
  loadingMap.isSubmitting = true;
  try {
    await GeneralData.patch(
      serverData?.id ?? Number(route.params["id"]),
      formData.value,
    );
    original.value = { ...formData.value };
    toast.add({ color: "success", title: "配置已保存" });
    await refreshAll();
  } catch (error) {
    console.error("Submit failed:", error);
    toast.add({ color: "error", title: "保存配置失败，请稍后再试" });
  } finally {
    loadingMap.isSubmitting = false;
  }
};

const cancelChanges = () => {
  formData.value = original.value ? { ...original.value } : null;
};

onMounted(async () => {
  await refreshAll();
  setPageState({
    isDirty: () => isDirty.value,
    save: handleSubmit,
  });
});

onUnmounted(() => {
  clearPageState();
});
</script>
