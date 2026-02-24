<template>
  <div>
    <ServerHeader class="mb-3" />
    <n-form :model="formData" :rules="rules">
      <n-grid :cols="isMobile ? 1 : '2'" x-gap="12" y-gap="12">
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
      <n-button :disabled="!isDirty" :loading="isAnyLoading" @click="cancelChanges">取消</n-button>
      <n-button :disabled="!isDirty" :loading="isAnyLoading" ghost type="primary" @click="handleSubmit">
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
import { isMobile } from "#imports";
import { cloneDeep, isEqual } from "lodash-es";
import type { SelectMixedOption } from "naive-ui/es/select/src/interface";
import type z from "zod";
import { AdapterData, GeneralData, ServerData } from "~/composables/api";
import { GeneralAPI } from "~~/shared/schemas/server/general";
import type { ServerWithStatus } from "~~/shared/schemas/server/servers";
import { zodToNaiveRules } from "~/composables/useValidation";
import ServerHeader from "~/components/Header/ServerHeader.vue";

definePageMeta({
  layout: "default"
});

const { setPageState, clearPageState } = usePageStateStore();
const route = useRoute();
const message = useMessage();
const dialog = useDialog();
const router = useRouter();
const loadingMap = reactive({
  isLoading: true,
  isSubmitting: false
});
const isAnyLoading = computed(() => loadingMap.isLoading);
const isDirty = computed(() => !isEqual(formData, original));
const rules = zodToNaiveRules(GeneralAPI.PATCH.request);
const adapterOptions = ref<SelectMixedOption[]>([]);
let serverData: ServerWithStatus | null = null;
const formData = reactive<z.infer<typeof GeneralAPI.PATCH.request>>({
  adapterId: null
});
const original = reactive<z.infer<typeof GeneralAPI.PATCH.request>>({
  adapterId: null
});

async function handleDelete() {
  dialog.warning({
    title: "确认删除",
    content: "确定要删除此服务器吗？删除后将无法恢复。",
    positiveText: "确认删除",
    negativeText: "取消",
    onPositiveClick: async () => {
      try {
        await ServerData.delete(Number(serverData?.id ?? route.params["id"]));
        message.success("服务器已删除～");
        serverData = null;
        router.push("/");
      } catch (error) {
        console.error("Delete failed:", error);
        message.error("删除服务器失败");
      }
    }
  });
}

async function handleSubmit(): Promise<void> {
  loadingMap.isSubmitting = true;
  try {
    await GeneralData.patch(serverData?.id ?? Number(route.params["id"]), formData);
    Object.assign(original, cloneDeep(formData));
    message.success("配置已保存");
    await refreshAll();
  } catch (error) {
    console.error("Submit failed:", error);
    message.error("保存配置失败，请稍后再试");
  } finally {
    loadingMap.isSubmitting = false;
  }
}

async function refreshAll(): Promise<void> {
  loadingMap.isLoading = true;
  try {
    const [adapterData, serverDataResult] = await Promise.all([
      AdapterData.gets(),
      ServerData.get(Number(route.params["id"]))
    ]);

    serverData = serverDataResult;

    adapterOptions.value = adapterData.map((adapter) => ({
      label: `#${adapter.id} - ${adapter.type} [${adapter.isOnline ? "在线" : "离线"}${adapter.enabled ? "" : " · 已禁用"}]`,
      value: adapter.id
    }));

    formData.adapterId = serverDataResult.adapterId;
    Object.assign(original, cloneDeep(formData));
  } catch (error) {
    console.error("Refresh failed:", error);
    message.error("加载数据失败");
  } finally {
    loadingMap.isLoading = false;
  }
}

function cancelChanges() {
  Object.assign(formData, cloneDeep(original));
}

onMounted(async () => {
  await refreshAll();
  setPageState({
    isDirty: () => isDirty.value,
    save: handleSubmit
  });
});

onUnmounted(() => {
  clearPageState();
});
</script>
