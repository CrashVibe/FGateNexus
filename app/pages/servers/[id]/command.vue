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
          <div
            class="grid gap-4"
            :class="isMobile ? 'grid-cols-1' : 'grid-cols-2'"
          >
            <UPageCard variant="outline">
              <template #title>基础设置</template>
              <template #footer>
                <UFormField
                  label="图片渲染"
                  description="将指令返回结果的颜色代码转换为图片后发送"
                >
                  <USwitch v-model="formData.config.imageRender" />
                </UFormField>
                <UAlert
                  v-if="currentConfig.executablePath === null"
                  color="warning"
                  variant="subtle"
                  icon="i-lucide-info"
                  class="mt-2"
                >
                  <template #description>
                    <UButton
                      variant="link"
                      color="warning"
                      size="sm"
                      class="p-0"
                      @click="router.push('/settings/browser')"
                    >
                      图片渲染功能需要配置浏览器路径才能使用（去配置）
                    </UButton>
                  </template>
                </UAlert>
              </template>
            </UPageCard>
            <UPageCard variant="outline">
              <template #title>配置群聊</template>
              <template #description>
                <span class="text-muted text-sm">单独对目标进行配置</span>
              </template>
              <template #footer>
                <UDropdownMenu
                  v-if="options.length"
                  :items="
                    options.map((o) => ({
                      label: o.label,
                      onSelect: () => handleSelect(o.key),
                    }))
                  "
                >
                  <UButton icon="i-lucide-settings-2">配置目标</UButton>
                </UDropdownMenu>
                <UAlert
                  v-else
                  color="warning"
                  variant="subtle"
                  icon="i-lucide-triangle-alert"
                >
                  <template #description>
                    <UButton
                      variant="link"
                      color="warning"
                      size="sm"
                      class="p-0"
                      @click="router.push(`/servers/${route.params.id}/target`)"
                    >
                      你还没有创建目标哦（去创建）
                    </UButton>
                  </template>
                </UAlert>
              </template>
            </UPageCard>
          </div>

          <USlideover
            v-model:open="drawerVisible"
            :title="
              selectTarget
                ? `目标配置 · ${selectTarget.targetId || selectTarget.id}`
                : ''
            "
          >
            <template #body>
              <drawer-command
                v-if="selectTarget"
                :adapter-type="adapterData?.type"
                :target="selectTarget"
              />
            </template>
          </USlideover>

          <USeparator class="my-4" />
          <div class="flex justify-end gap-2">
            <UButton
              color="neutral"
              variant="subtle"
              :disabled="isAnyLoading || !isDirty"
              :loading="isAnyLoading"
              @click="cancelChanges"
            >
              取消更改
            </UButton>
            <UButton
              :disabled="isAnyLoading || !isDirty"
              :loading="isAnyLoading"
              @click="handleSubmit"
            >
              保存配置
            </UButton>
          </div>
        </UContainer>
      </template>
    </UDashboardPanel>
  </div>
</template>

<script lang="ts" setup>
import { differenceWith, isEqual, pick } from "lodash-es";
import type { z } from "zod";
import type { AdapterWithStatus } from "~~/shared/schemas/adapter";
import { CommandConfigSchema } from "~~/shared/schemas/server/command";
import type {
  CommandAPI,
  CommandConfig,
} from "~~/shared/schemas/server/command";
import type { ServerWithStatus } from "~~/shared/schemas/server/servers";
import type { targetResponse } from "~~/shared/schemas/server/target";
import { pickEditableTarget } from "~~/shared/utils/target";

import ServerHeader from "@/components/header/server-header.vue";
import { useIsMobile } from "@/composables/is-mobile";
import {
  AdapterData,
  BrowserData,
  CommandData,
  ServerData,
} from "~/composables/api";

const isMobile = useIsMobile();

const { setPageState, clearPageState } = usePageStateStore();

definePageMeta({ layout: "default" });

const route = useRoute();
const router = useRouter();
const toast = useToast();

interface FormState {
  config: CommandConfig;
  targets: targetResponse[];
}

const formData = reactive<FormState>({
  config: CommandConfigSchema.parse({}),
  targets: [],
});

const selectTarget = ref<targetResponse | null>(null);
const drawerVisible = ref(false);
let serverData: ServerWithStatus | null = null;
const adapterData = ref<AdapterWithStatus | null>(null);
const currentConfig = ref<{
  executablePath: string | null;
}>({ executablePath: null });

const originalFormData = ref<FormState | null>(null);

const loadingMap = reactive({
  isLoading: true,
  isSubmitting: false,
});

const isDirty = computed(() => !isEqual(formData, originalFormData.value));
const isAnyLoading = computed(() => Object.values(loadingMap).some(Boolean));

const options = ref<{ label: string; key: string }[]>([]);

const handleSelect = (key: string) => {
  drawerVisible.value = true;
  const selected = serverData?.targets.find(
    (t) => String(t.id) === String(key),
  );
  if (selected) {
    const editable = pickEditableTarget(selected, formData.targets);
    selectTarget.value = editable;
  }
};

const refreshServerData = async (): Promise<void> => {
  if (!route.params["id"]) {
    return;
  }
  loadingMap.isLoading = true;
  try {
    const data = await ServerData.get(Number(route.params["id"]));
    serverData = data;
    options.value = data.targets.map((target) => ({
      key: target.id,
      label: target.targetId,
    }));
    adapterData.value = data.adapterId
      ? await AdapterData.get(data.adapterId)
      : null;
    formData.config = structuredClone(
      data.commandConfig || CommandConfigSchema.parse({}),
    );
    formData.targets = structuredClone(data.targets || []);
    originalFormData.value = structuredClone(toRaw(formData));
  } catch (error) {
    console.error("Failed to refresh server data:", error);
    toast.add({ color: "error", title: "刷新服务器数据失败" });
  } finally {
    loadingMap.isLoading = false;
  }
};

const handleSubmit = async () => {
  if (!isDirty.value) {
    return;
  }

  const targetsPayload: z.infer<typeof CommandAPI.PATCH.request>["targets"] =
    differenceWith(
      formData.targets,
      originalFormData.value?.targets || [],
      isEqual,
    ).map((t) => pick(t, ["id", "config"]));

  loadingMap.isSubmitting = true;
  try {
    await CommandData.patch(Number(route.params["id"]), {
      command: formData.config,
      targets: targetsPayload,
    });
    toast.add({ color: "success", title: "配置已保存" });
    selectTarget.value = null;
    await refreshServerData();
  } catch (error) {
    console.error("Submit failed:", error);
    toast.add({ color: "error", title: "保存配置失败，请稍后再试" });
  } finally {
    loadingMap.isSubmitting = false;
  }
};

const cancelChanges = () => {
  if (originalFormData.value) {
    Object.assign(formData, structuredClone(toRaw(originalFormData.value)));
  } else {
    formData.config = CommandConfigSchema.parse({});
    formData.targets = [];
  }
  selectTarget.value = null;
};

const loadConfig = async () => {
  loadingMap.isLoading = true;
  try {
    const data = await BrowserData.get();
    currentConfig.value = data ?? { executablePath: null };
  } catch {
    toast.add({ color: "error", title: "加载配置失败" });
  } finally {
    loadingMap.isLoading = false;
  }
};

onMounted(async () => {
  await refreshServerData();
  await loadConfig();
  setPageState({ isDirty: () => isDirty.value, save: handleSubmit });
});

onUnmounted(() => {
  clearPageState();
});
</script>
