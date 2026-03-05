<template>
  <div>
    <ServerHeader class="mb-3" />

    <n-grid :cols="isMobile ? 1 : '2'" x-gap="12" y-gap="12">
      <n-grid-item>
        <n-card class="h-full" size="small" title="配置群聊">
          单独对目标进行配置
          <template #footer>
            <n-dropdown
              v-if="options.length"
              trigger="hover"
              :options="options"
              @select="handleSelect"
            >
              <n-button>配置目标</n-button>
            </n-dropdown>
            <n-alert v-else type="warning">
              <n-button
                text
                dashed
                @click="router.push(`/servers/${route.params.id}/target`)"
              >
                你还没有创建目标哦（去创建）
              </n-button>
            </n-alert>
          </template>
        </n-card>
      </n-grid-item>
    </n-grid>

    <n-drawer v-model:show="drawerVisible" :width="502">
      <drawer-command
        v-if="selectTarget"
        :adapter-type="adapterData?.type"
        :target="selectTarget"
      />
    </n-drawer>

    <n-divider />
    <div class="flex justify-end gap-2">
      <n-button
        :disabled="isAnyLoading || !isDirty"
        :loading="isAnyLoading"
        @click="cancelChanges"
        >取消更改</n-button
      >
      <n-button
        :disabled="isAnyLoading || !isDirty"
        :loading="isAnyLoading"
        ghost
        type="primary"
        @click="handleSubmit"
      >
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

<script lang="ts" setup>
import { differenceWith, isEqual, pick } from "lodash-es";
import type { FormInst } from "naive-ui";
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

import { isMobile } from "#imports";
import ServerHeader from "@/components/header/server-header.vue";
import { AdapterData, CommandData, ServerData } from "~/composables/api";

const { setPageState, clearPageState } = usePageStateStore();

definePageMeta({ layout: "default" });

const route = useRoute();
const router = useRouter();
const message = useMessage();
const formRef = ref<FormInst>();

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
    message.error("刷新服务器数据失败");
  } finally {
    loadingMap.isLoading = false;
  }
};

const handleSubmit = async () => {
  if (!isDirty.value) {
    message.info("没有需要保存的更改");
    return;
  }

  try {
    await formRef.value?.validate();
  } catch {
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
    message.success("配置已保存");
    selectTarget.value = null;
    await refreshServerData();
  } catch (error) {
    console.error("Submit failed:", error);
    message.error("保存配置失败，请稍后再试");
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

onMounted(async () => {
  await refreshServerData();
  setPageState({ isDirty: () => isDirty.value, save: handleSubmit });
});

onUnmounted(() => {
  clearPageState();
});
</script>
