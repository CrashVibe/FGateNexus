<template>
  <div>
    <HeaderServer class="mb-3" />

    <n-grid :cols="isMobile ? 1 : '2'" x-gap="12" y-gap="12">
      <n-grid-item>
        <n-card class="h-full" size="small" title="配置群聊">
          单独对目标进行配置
          <template #footer>
            <n-dropdown v-if="options.length" trigger="hover" :options="options" @select="handleSelect">
              <n-button>配置目标</n-button>
            </n-dropdown>
            <n-alert v-else type="warning">
              <n-button text dashed @click="router.push(`/servers/${route.params.id}/target`)">
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
        :adapter-type="dataState.data.adapterData?.type"
        :target="selectTarget"
        @save="handleTargetSave"
      />
    </n-drawer>

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

<script lang="ts" setup>
import { isMobile } from "#imports";
import { StatusCodes } from "http-status-codes";
import type { z } from "zod";
import type { PageState } from "~~/app/composables/usePageState";
import type { AdapterWithStatus } from "~~/shared/schemas/adapter";
import type { CommandConfig, commandPatchBodySchema } from "~~/shared/schemas/server/command";
import type { ServerWithStatus } from "~~/shared/schemas/server/servers";
import type { targetSchema } from "~~/shared/schemas/server/target";
import type { ApiResponse } from "~~/shared/types";
import { getDefaultCommandConfig } from "~~/shared/utils/command";

export type CommandPatchBody = z.infer<typeof commandPatchBodySchema>;

definePageMeta({ layout: "server-edit" });

const registerPageState = inject<(state: PageState) => void>("registerPageState");
const clearPageState = inject<() => void>("clearPageState");
const route = useRoute();
const router = useRouter();
const message = useMessage();

const formRef = ref();
const formData = ref<CommandConfig>(getDefaultCommandConfig());

const editedTargets = ref(new Map<string, targetSchema>());
const selectTarget = ref<targetSchema | null>(null);
const drawerVisible = ref(false);

const dataState = reactive({
  data: {
    serverData: null as ServerWithStatus | null,
    adapterData: null as AdapterWithStatus | null
  },
  isLoading: true,
  isSubmitting: false,
  original: { commandConfig: null as CommandConfig | null }
});

const options = computed(
  () =>
    dataState.data.serverData?.targets?.map((t) => ({
      label: t.targetId ?? t.id,
      key: String(t.id)
    })) || []
);

function getOriginalTargetById(id: string): targetSchema | null {
  return (dataState.data.serverData?.targets || []).find((t) => String(t.id) === String(id)) || null;
}

function pickEditableTarget(raw: targetSchema): targetSchema {
  const id = String(raw.id);
  if (!editedTargets.value.has(id)) {
    editedTargets.value.set(id, JSON.parse(JSON.stringify(raw)));
  }
  return editedTargets.value.get(id)!;
}

const modifiedTargets = computed(() => {
  const list = Array.from(editedTargets.value.values());
  return list.filter((t) => {
    const original = getOriginalTargetById(String(t.id));
    if (!original) return true;
    return JSON.stringify(t.config) !== JSON.stringify(original.config);
  });
});

const isDirty = computed(() => {
  const formChanged =
    !dataState.isLoading && JSON.stringify(formData.value) !== JSON.stringify(dataState.original.commandConfig);
  const targetsChanged = modifiedTargets.value.length > 0;
  return formChanged || targetsChanged;
});

const isAnyLoading = computed(() => dataState.isLoading || dataState.isSubmitting);

// 数据管理
class DataManager {
  async refreshServerData(): Promise<void> {
    if (!route.params?.id) return;
    try {
      const response = await $fetch<ApiResponse<ServerWithStatus>>(`/api/servers/${route.params.id}`);
      if (response.code === StatusCodes.OK && response.data) {
        dataState.data.serverData = response.data;
        dataState.original.commandConfig = response.data.commandConfig as CommandConfig;
        formData.value = JSON.parse(JSON.stringify(response.data.commandConfig || getDefaultCommandConfig()));
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

  async updateServer(serverId: number, body: CommandPatchBody): Promise<void> {
    await $fetch<ApiResponse<ServerWithStatus>>(`/api/servers/${serverId}/command`, {
      method: "PATCH",
      body
    });
    dataState.original.commandConfig = JSON.parse(JSON.stringify(body.command));
  }

  async refreshAll(): Promise<void> {
    dataState.isLoading = true;
    await this.refreshServerData().finally(() => {
      dataState.isLoading = false;
    });
  }
}

const dataManager = new DataManager();

function handleSelect(key: string) {
  const raw = (dataState.data.serverData?.targets || []).find((t) => String(t.id) === String(key));
  if (!raw) return;
  const editable = pickEditableTarget(raw);
  selectTarget.value = editable;
  drawerVisible.value = true;
}

function handleTargetSave(updated: targetSchema) {
  const id = String(updated?.id);
  if (!id) return;
  const original = getOriginalTargetById(id);
  if (!original) return;
  editedTargets.value.set(id, JSON.parse(JSON.stringify(updated)));
  drawerVisible.value = false;
}

async function handleSubmit() {
  if (!dataState.data.serverData) {
    message.error("服务器数据未加载或无效");
    return;
  }
  if (!isDirty.value) {
    message.info("没有需要保存的更改");
    return;
  }

  try {
    await formRef.value?.validate();
  } catch {
    return;
  }

  const targetsPayload: CommandPatchBody["targets"] = modifiedTargets.value.map((t) => ({
    id: t.id,
    config: t.config
  }));

  if (!targetsPayload.length && selectTarget.value) {
    const t = selectTarget.value;
    targetsPayload.push({ id: t.id, config: t.config });
  }

  const payload: CommandPatchBody = { command: formData.value, targets: targetsPayload };

  try {
    dataState.isSubmitting = true;
    await dataManager.updateServer(dataState.data.serverData.id, payload);
    message.success("远程指令配置已保存");
    editedTargets.value.clear();
    selectTarget.value = null;
    dataState.isSubmitting = false;
    await dataManager.refreshAll();
  } catch (error) {
    console.error("Submit failed:", error);
    dataState.isSubmitting = false;
  }
}

function cancelChanges() {
  if (dataState.original.commandConfig) {
    formData.value = JSON.parse(JSON.stringify(dataState.original.commandConfig));
  } else {
    formData.value = getDefaultCommandConfig();
  }
  editedTargets.value.clear();
  selectTarget.value = null;
}

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
  if (clearPageState) clearPageState();
});
</script>
