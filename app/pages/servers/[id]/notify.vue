<template>
  <div>
    <ServerHeader class="mb-3" />
    <n-form ref="formRef" :model="formData" :rules="rules">
      <n-grid :cols="isMobile ? 1 : '2'" x-gap="12" y-gap="12" class="mb-3">
        <n-grid-item>
          <n-card class="h-full" size="small" title="玩家进出事件">
            <n-form-item label="是否启用" path="player_notify">
              <n-switch v-model:value="formData.config.player_notify" />
            </n-form-item>
            <n-form-item
              class="mb-2"
              label="玩家进出时发送的消息"
              path="join_notify_message"
            >
              <n-input
                v-model:value="formData.config.join_notify_message"
                maxlength="200"
                placeholder="绑定成功时的反馈消息"
                show-count
              />
              <template #feedback>
                <div class="mt-2 space-y-2">
                  <div class="flex flex-wrap gap-1">
                    <n-tooltip
                      v-for="tag in joinVariables"
                      :key="tag.value"
                      trigger="hover"
                    >
                      <template #trigger>
                        <n-tag
                          :type="
                            formData.config.join_notify_message.includes(
                              tag.value,
                            )
                              ? 'primary'
                              : 'default'
                          "
                          class="cursor-pointer"
                          size="small"
                          @click="
                            insertPlaceholder('join_notify_message', tag.value)
                          "
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
                      {{
                        renderJoinMessage(
                          formData.config.join_notify_message,
                          "Steve",
                        )
                      }}
                    </n-text>
                  </div>
                </div>
              </template>
            </n-form-item>
            <n-form-item
              class="mb-2"
              label="玩家离开时发送的消息"
              path="leave_notify_message"
            >
              <n-input
                v-model:value="formData.config.leave_notify_message"
                maxlength="200"
                placeholder="绑定成功时的反馈消息"
                show-count
              />
              <template #feedback>
                <div class="mt-2 space-y-2">
                  <div class="flex flex-wrap gap-1">
                    <n-tooltip
                      v-for="tag in leaveVariables"
                      :key="tag.value"
                      trigger="hover"
                    >
                      <template #trigger>
                        <n-tag
                          :type="
                            formData.config.leave_notify_message.includes(
                              tag.value,
                            )
                              ? 'primary'
                              : 'default'
                          "
                          class="cursor-pointer"
                          size="small"
                          @click="
                            insertPlaceholder('leave_notify_message', tag.value)
                          "
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
                      {{
                        renderLeaveMessage(
                          formData.config.leave_notify_message,
                          "Steve",
                        )
                      }}
                    </n-text>
                  </div>
                </div>
              </template>
            </n-form-item>
          </n-card>
        </n-grid-item>
        <n-grid-item>
          <n-card class="h-full" size="small" title="死亡事件">
            <n-form-item label="是否启用" path="player_disappoint_notify">
              <n-switch
                v-model:value="formData.config.player_disappoint_notify"
              />
            </n-form-item>
            <n-form-item
              class="mb-2"
              label="玩家死亡时发送的消息"
              path="death_notify_message"
            >
              <n-input
                v-model:value="formData.config.death_notify_message"
                maxlength="200"
                placeholder="玩家死亡时发送的消息"
                show-count
              />
              <template #feedback>
                <div class="mt-2 space-y-2">
                  <div class="flex flex-wrap gap-1">
                    <n-tooltip
                      v-for="tag in deathVariables"
                      :key="tag.value"
                      trigger="hover"
                    >
                      <template #trigger>
                        <n-tag
                          :type="
                            formData.config.death_notify_message.includes(
                              tag.value,
                            )
                              ? 'primary'
                              : 'default'
                          "
                          class="cursor-pointer"
                          size="small"
                          @click="
                            insertPlaceholder('death_notify_message', tag.value)
                          "
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
                      {{
                        renderDeathMessage(
                          formData.config.death_notify_message,
                          "Steve",
                          "掉落",
                        )
                      }}
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
      <n-drawer-content
        v-if="selectTarget"
        closable
        :title="`目标配置 · ${selectTarget.targetId || selectTarget.id}`"
      >
        <n-form :model="selectTarget">
          <n-form-item label="是否开启此目标的通知" required>
            <n-switch
              v-model:value="selectTarget.config.NotifyConfigSchema.enabled"
            />
          </n-form-item>
        </n-form>
      </n-drawer-content>
    </n-drawer>

    <n-divider />
    <div class="flex justify-end gap-2">
      <n-button
        :disabled="!isDirty"
        :loading="isAnyLoading"
        @click="cancelChanges"
        >取消</n-button
      >
      <n-button
        :disabled="!isDirty"
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
        保存设置
      </n-button>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { isEqual, differenceWith, pick } from "lodash-es";
import type { FormInst } from "naive-ui";
import type { z } from "zod";
import { NotifyConfigSchema } from "~~/shared/schemas/server/notify";
import type { NotifyAPI } from "~~/shared/schemas/server/notify";
import type { ServerWithStatus } from "~~/shared/schemas/server/servers";
import type { targetResponse } from "~~/shared/schemas/server/target";
import { pickEditableTarget } from "~~/shared/utils/target";
import {
  renderDeathMessage,
  renderJoinMessage,
  renderLeaveMessage,
} from "~~/shared/utils/template/notify";

import { isMobile } from "#imports";
import ServerHeader from "@/components/header/server-header.vue";
import { NotifyData, ServerData } from "~/composables/api";
import {
  createVariablesArray,
  createVariableMap,
} from "~/composables/use-placeholder-variables";

definePageMeta({ layout: "default" });

const { setPageState, clearPageState } = usePageStateStore();
const route = useRoute();
const message = useMessage();
const router = useRouter();
const formRef = ref<FormInst>();

interface FormState {
  config: z.infer<typeof NotifyConfigSchema>;
  targets: targetResponse[];
}

const formData = reactive<FormState>({
  config: NotifyConfigSchema.parse({}),
  targets: [],
});
const rules = zodToNaiveRules(NotifyConfigSchema);

const selectTarget = ref<targetResponse | null>(null);
const drawerVisible = ref(false);
const originalFormData = ref<FormState | null>(null);
let serverData: ServerWithStatus | null = null;
const options = ref<{ label: string; key: string }[]>([]);

const loadingMap = reactive({
  isLoading: true,
  isSubmitting: false,
});

// 占位符变量定义
const NOTIFY_VARIABLES = createVariableMap({
  "{deathMessage}": { example: "掉落", label: "死亡原因" },
  "{playerName}": { example: "Steve", label: "玩家名称" },
});

const joinVariables = computed(() =>
  createVariablesArray({
    "{playerName}": NOTIFY_VARIABLES["{playerName}"],
  }),
);

const leaveVariables = computed(() =>
  createVariablesArray({
    "{playerName}": NOTIFY_VARIABLES["{playerName}"],
  }),
);

const deathVariables = computed(() =>
  createVariablesArray({
    "{deathMessage}": NOTIFY_VARIABLES["{deathMessage}"],
    "{playerName}": NOTIFY_VARIABLES["{playerName}"],
  }),
);

const insertPlaceholder = (
  field: keyof Pick<
    z.infer<typeof NotifyConfigSchema>,
    "join_notify_message" | "leave_notify_message" | "death_notify_message"
  >,
  placeholder: string,
) => {
  const current = formData.config[field] || "";
  formData.config[field] = current + placeholder;
};

const refreshServerData = async (): Promise<void> => {
  if (!route.params["id"]) {
    return;
  }
  loadingMap.isLoading = true;
  try {
    const data = await ServerData.get(Number(route.params["id"]));
    serverData = data;
    formData.config = structuredClone(data.notifyConfig);
    formData.targets = structuredClone(data.targets);
    originalFormData.value = structuredClone(toRaw(formData));
    options.value = data.targets.map((target) => ({
      key: target.id,
      label: target.targetId,
    }));
  } catch (error) {
    console.error(error);
    message.error("刷新服务器数据失败");
  } finally {
    loadingMap.isLoading = false;
  }
};

const isDirty = computed(() => !isEqual(formData, originalFormData.value));

const isAnyLoading = computed(() => Object.values(loadingMap).some(Boolean));

const handleSelect = (key: string) => {
  drawerVisible.value = true;
  const selected = serverData?.targets.find((t) => t.id === key) || null;
  if (selected) {
    const editable = pickEditableTarget(selected, formData.targets);
    selectTarget.value = editable;
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

  const targetsPayload: z.infer<typeof NotifyAPI.PATCH.request>["targets"] =
    differenceWith(
      formData.targets,
      originalFormData.value?.targets || [],
      isEqual,
    ).map((t) => pick(t, ["id", "config"]));

  loadingMap.isSubmitting = true;
  try {
    await NotifyData.patch(Number(route.params["id"]), {
      notify: formData.config,
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
    formData.config = NotifyConfigSchema.parse({});
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
