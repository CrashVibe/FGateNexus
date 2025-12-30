<template>
  <div>
    <HeaderServer class="mb-3" />
    <n-form ref="formRef" :model="formData" :rules="rules">
      <n-grid :cols="isMobile ? 1 : '2'" x-gap="12" y-gap="12" class="mb-3">
        <n-grid-item>
          <n-card class="h-full" size="small" title="玩家进出事件">
            <n-form-item label="是否启用" path="player_notify">
              <n-switch v-model:value="formData.player_notify" />
            </n-form-item>
            <n-form-item class="mb-2" label="玩家进出时发送的消息" path="join_notify_message">
              <n-input
                v-model:value="formData.join_notify_message"
                maxlength="200"
                placeholder="绑定成功时的反馈消息"
                show-count
              />
              <template #feedback>
                <div class="mt-2 space-y-2">
                  <div class="flex flex-wrap gap-1">
                    <n-tooltip v-for="tag in joinVariables" :key="tag.value" trigger="hover">
                      <template #trigger>
                        <n-tag
                          :type="formData.join_notify_message.includes(tag.value) ? 'primary' : 'default'"
                          class="cursor-pointer"
                          size="small"
                          @click="insertPlaceholder('join_notify_message', tag.value)"
                        >
                          {{ tag.value }}
                        </n-tag>
                      </template>
                      {{ tag.label }} · [{{ tag.example }}]
                    </n-tooltip>
                  </div>
                  <div class="text-sm text-gray-500">
                    预览：
                    <n-text type="success">{{ renderJoinMessage(formData.join_notify_message, "Steve") }}</n-text>
                  </div>
                </div>
              </template>
            </n-form-item>
            <n-form-item class="mb-2" label="玩家离开时发送的消息" path="leave_notify_message">
              <n-input
                v-model:value="formData.leave_notify_message"
                maxlength="200"
                placeholder="绑定成功时的反馈消息"
                show-count
              />
              <template #feedback>
                <div class="mt-2 space-y-2">
                  <div class="flex flex-wrap gap-1">
                    <n-tooltip v-for="tag in leaveVariables" :key="tag.value" trigger="hover">
                      <template #trigger>
                        <n-tag
                          :type="formData.leave_notify_message.includes(tag.value) ? 'primary' : 'default'"
                          class="cursor-pointer"
                          size="small"
                          @click="insertPlaceholder('leave_notify_message', tag.value)"
                        >
                          {{ tag.value }}
                        </n-tag>
                      </template>
                      {{ tag.label }} · [{{ tag.example }}]
                    </n-tooltip>
                  </div>
                  <div class="text-sm text-gray-500">
                    预览：
                    <n-text type="success">{{ renderLeaveMessage(formData.leave_notify_message, "Steve") }}</n-text>
                  </div>
                </div>
              </template>
            </n-form-item>
          </n-card>
        </n-grid-item>
        <n-grid-item>
          <n-card class="h-full" size="small" title="死亡事件">
            <n-form-item label="是否启用" path="player_disappoint_notify">
              <n-switch v-model:value="formData.player_disappoint_notify" />
            </n-form-item>
            <n-form-item class="mb-2" label="玩家死亡时发送的消息" path="death_notify_message">
              <n-input
                v-model:value="formData.death_notify_message"
                maxlength="200"
                placeholder="玩家死亡时发送的消息"
                show-count
              />
              <template #feedback>
                <div class="mt-2 space-y-2">
                  <div class="flex flex-wrap gap-1">
                    <n-tooltip v-for="tag in deathVariables" :key="tag.value" trigger="hover">
                      <template #trigger>
                        <n-tag
                          :type="formData.death_notify_message.includes(tag.value) ? 'primary' : 'default'"
                          class="cursor-pointer"
                          size="small"
                          @click="insertPlaceholder('death_notify_message', tag.value)"
                        >
                          {{ tag.value }}
                        </n-tag>
                      </template>
                      {{ tag.label }} · [{{ tag.example }}]
                    </n-tooltip>
                  </div>
                  <div class="text-sm text-gray-500">
                    预览：
                    <n-text type="success">
                      {{ renderDeathMessage(formData.death_notify_message, "Steve", "掉落") }}
                    </n-text>
                  </div>
                </div>
              </template>
            </n-form-item>
          </n-card>
        </n-grid-item>
      </n-grid>
    </n-form>

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
      <n-drawer-content v-if="selectTarget" closable :title="`目标配置 · ${selectTarget.targetId || selectTarget.id}`">
        <n-form :model="selectTarget">
          <n-form-item label="是否开启此目标的通知" required>
            <n-switch v-model:value="selectTarget.config.NotifyConfigSchema.enabled" />
          </n-form-item>
        </n-form>
      </n-drawer-content>
    </n-drawer>

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
import { isMobile } from "#imports";
import { StatusCodes } from "http-status-codes";
import type { FormInst } from "naive-ui";
import type { z } from "zod";
import { NotifyConfigSchema, type NotifyConfig, type notifyPatchBodySchema } from "~~/shared/schemas/server/notify";
import type { ServerWithStatus } from "~~/shared/schemas/server/servers";
import type { targetSchema } from "~~/shared/schemas/server/target";
import type { ApiResponse } from "~~/shared/types";
import { renderDeathMessage, renderJoinMessage, renderLeaveMessage } from "~~/shared/utils/template/notify";

export type NotifyPatchBody = z.infer<typeof notifyPatchBodySchema>;

definePageMeta({ layout: "server-edit" });

const { setPageState, clearPageState } = usePageStateStore();

const route = useRoute();
const message = useMessage();
const router = useRouter();
const formRef = ref<FormInst>();
const formData = ref<NotifyConfig>(getDefaultNotifyConfig());
const rules = zodToNaiveRules(NotifyConfigSchema);

const editedTargets = ref(new Map<string, targetSchema>());
const selectTarget = ref<targetSchema | null>(null);
const drawerVisible = ref(false);

const dataState = reactive({
  data: { serverData: null as ServerWithStatus | null },
  isLoading: true,
  isSubmitting: false,
  original: { NotifyConfig: null as NotifyConfig | null }
});

function insertPlaceholder(
  field: keyof Pick<NotifyConfig, "join_notify_message" | "leave_notify_message" | "death_notify_message">,
  placeholder: string
) {
  const current = formData.value[field] || "";
  formData.value[field] = current + placeholder;
}

const joinVariables = [{ label: "玩家名称", value: "{playerName}", example: "Steve" }];
const leaveVariables = [{ label: "玩家名称", value: "{playerName}", example: "Steve" }];
const deathVariables = [
  { label: "玩家名称", value: "{playerName}", example: "Steve" },
  { label: "死亡原因", value: "{deathMessage}", example: "掉落" }
];

class DataManager {
  async refreshServerData(): Promise<void> {
    if (!route.params?.id) return;
    try {
      const response = await $fetch<ApiResponse<ServerWithStatus>>(`/api/servers/${route.params.id}`);
      if (response.code === StatusCodes.OK && response.data) {
        dataState.data.serverData = response.data;
        dataState.original = { NotifyConfig: response.data.notifyConfig };
        formData.value = JSON.parse(JSON.stringify(response.data.notifyConfig));
      }
    } catch (error) {
      console.error("Failed to refresh server data:", error);
      message.error("刷新服务器数据失败");
    }
  }

  async updateServer(serverId: number, body: NotifyPatchBody): Promise<void> {
    await $fetch<ApiResponse<ServerWithStatus>>(`/api/servers/${serverId}/notify`, { method: "PATCH", body });
    dataState.original.NotifyConfig = JSON.parse(JSON.stringify(body.notify));
  }

  async refreshAll(): Promise<void> {
    dataState.isLoading = true;
    await this.refreshServerData().finally(() => {
      dataState.isLoading = false;
    });
  }
}

const dataManager = new DataManager();

function getOriginalTargetById(id: string): targetSchema | null {
  return dataState.data.serverData?.targets.find((t) => t.id === id) || null;
}

const modifiedTargets = computed(() => {
  const list = Array.from(editedTargets.value.values());
  return list.filter((t) => {
    const original = getOriginalTargetById(t.id);
    if (!original) return true;
    return JSON.stringify(t.config) !== JSON.stringify(original.config);
  });
});

const isDirty = computed(() => {
  const formChanged =
    !dataState.isLoading && JSON.stringify(formData.value) !== JSON.stringify(dataState.original.NotifyConfig);
  const targetsChanged = modifiedTargets.value.length > 0;
  return formChanged || targetsChanged;
});

const isAnyLoading = computed(() => dataState.isLoading || dataState.isSubmitting);

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

  const targetsPayload: NotifyPatchBody["targets"] = modifiedTargets.value.map((t) => ({
    id: t.id,
    config: t.config
  }));
  if (!targetsPayload.length && selectTarget.value) {
    const t = selectTarget.value;
    targetsPayload.push({ id: t.id, config: t.config });
  }

  const payload: NotifyPatchBody = { notify: formData.value, targets: targetsPayload };

  try {
    dataState.isSubmitting = true;
    await dataManager.updateServer(dataState.data.serverData.id, payload);
    message.success("事件通知设置已保存");
    dataState.isSubmitting = false;
    editedTargets.value.clear();
    selectTarget.value = null;
    await dataManager.refreshAll();
  } catch (error) {
    console.error("Submit failed:", error);
    dataState.isSubmitting = false;
  }
}

function cancelChanges() {
  if (dataState.original.NotifyConfig) {
    formData.value = JSON.parse(JSON.stringify(dataState.original.NotifyConfig));
  } else {
    formData.value = getDefaultNotifyConfig();
  }
  editedTargets.value.clear();
  selectTarget.value = null;
}

onMounted(async () => {
  await dataManager.refreshAll();
  setPageState({ isDirty: () => isDirty.value, save: handleSubmit });
});

onUnmounted(() => {
  clearPageState();
});

const options = computed(
  () => dataState.data.serverData?.targets?.map((target) => ({ label: target.targetId, key: target.id })) || []
);

function pickEditableTarget(raw: targetSchema): targetSchema {
  const id = raw.id;
  if (!editedTargets.value.has(id)) {
    editedTargets.value.set(id, JSON.parse(JSON.stringify(raw)));
  }
  return editedTargets.value.get(id) as targetSchema;
}

function handleSelect(key: string) {
  drawerVisible.value = true;
  const selected = dataState.data.serverData?.targets.find((t) => t.id.toString() === key) || null;
  if (selected) {
    const editable = pickEditableTarget(selected);
    selectTarget.value = editable;
  }
}
</script>
