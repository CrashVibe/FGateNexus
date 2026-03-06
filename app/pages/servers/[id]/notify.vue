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
          <div class="mb-4" :class="isMobile ? 'columns-1' : 'columns-2'">
            <!-- 玩家进出事件 -->
            <UPageCard variant="outline" class="mb-4 break-inside-avoid">
              <template #title>玩家进出事件</template>
              <template #description>
                <span class="text-muted text-sm"
                  >玩家加入/离开服务器时发送通知</span
                >
              </template>
              <template #footer>
                <div class="flex flex-col gap-4">
                  <UFormField name="player_notify" label="是否启用">
                    <USwitch v-model="formData.config.player_notify" />
                  </UFormField>

                  <UFormField
                    name="join_notify_message"
                    label="玩家进出时发送的消息"
                  >
                    <UInput
                      v-model="formData.config.join_notify_message"
                      :maxlength="200"
                      class="w-full"
                      placeholder="玩家进入时的通知消息"
                    />
                    <div class="mt-2 space-y-2">
                      <p class="text-muted text-xs">点击变量插入到消息</p>
                      <div class="flex flex-wrap gap-1">
                        <UTooltip
                          v-for="tag in joinVariables"
                          :key="tag.value"
                          :text="`${tag.label} · [${tag.example}]`"
                        >
                          <UBadge
                            :color="
                              formData.config.join_notify_message.includes(
                                tag.value,
                              )
                                ? 'primary'
                                : 'neutral'
                            "
                            variant="subtle"
                            class="cursor-pointer"
                            @click="
                              insertPlaceholder(
                                'join_notify_message',
                                tag.value,
                              )
                            "
                          >
                            {{ tag.value }}
                          </UBadge>
                        </UTooltip>
                      </div>
                      <div class="text-muted text-sm">
                        预览：
                        <span class="text-success">{{
                          renderJoinMessage(
                            formData.config.join_notify_message,
                            "Steve",
                          )
                        }}</span>
                      </div>
                    </div>
                  </UFormField>

                  <UFormField
                    name="leave_notify_message"
                    label="玩家离开时发送的消息"
                  >
                    <UInput
                      v-model="formData.config.leave_notify_message"
                      :maxlength="200"
                      class="w-full"
                      placeholder="玩家离开时的通知消息"
                    />
                    <div class="mt-2 space-y-2">
                      <p class="text-muted text-xs">点击变量插入到消息</p>
                      <div class="flex flex-wrap gap-1">
                        <UTooltip
                          v-for="tag in leaveVariables"
                          :key="tag.value"
                          :text="`${tag.label} · [${tag.example}]`"
                        >
                          <UBadge
                            :color="
                              formData.config.leave_notify_message.includes(
                                tag.value,
                              )
                                ? 'primary'
                                : 'neutral'
                            "
                            variant="subtle"
                            class="cursor-pointer"
                            @click="
                              insertPlaceholder(
                                'leave_notify_message',
                                tag.value,
                              )
                            "
                          >
                            {{ tag.value }}
                          </UBadge>
                        </UTooltip>
                      </div>
                      <div class="text-muted text-sm">
                        预览：
                        <span class="text-success">{{
                          renderLeaveMessage(
                            formData.config.leave_notify_message,
                            "Steve",
                          )
                        }}</span>
                      </div>
                    </div>
                  </UFormField>
                </div>
              </template>
            </UPageCard>

            <!-- 死亡事件 -->
            <UPageCard variant="outline" class="mb-4 break-inside-avoid">
              <template #title>死亡事件</template>
              <template #description>
                <span class="text-muted text-sm">玩家死亡时发送通知</span>
              </template>
              <template #footer>
                <div class="flex flex-col gap-4">
                  <UFormField name="player_disappoint_notify" label="是否启用">
                    <USwitch
                      v-model="formData.config.player_disappoint_notify"
                    />
                  </UFormField>

                  <UFormField
                    name="death_notify_message"
                    label="玩家死亡时发送的消息"
                  >
                    <UInput
                      v-model="formData.config.death_notify_message"
                      :maxlength="200"
                      class="w-full"
                      placeholder="玩家死亡时的通知消息"
                    />
                    <div class="mt-2 space-y-2">
                      <p class="text-muted text-xs">点击变量插入到消息</p>
                      <div class="flex flex-wrap gap-1">
                        <UTooltip
                          v-for="tag in deathVariables"
                          :key="tag.value"
                          :text="`${tag.label} · [${tag.example}]`"
                        >
                          <UBadge
                            :color="
                              formData.config.death_notify_message.includes(
                                tag.value,
                              )
                                ? 'primary'
                                : 'neutral'
                            "
                            variant="subtle"
                            class="cursor-pointer"
                            @click="
                              insertPlaceholder(
                                'death_notify_message',
                                tag.value,
                              )
                            "
                          >
                            {{ tag.value }}
                          </UBadge>
                        </UTooltip>
                      </div>
                      <div class="text-muted text-sm">
                        预览：
                        <span class="text-success">{{
                          renderDeathMessage(
                            formData.config.death_notify_message,
                            "Steve",
                            "掉落",
                          )
                        }}</span>
                      </div>
                    </div>
                  </UFormField>
                </div>
              </template>
            </UPageCard>

            <!-- 配置群聊 -->
            <UPageCard variant="outline" class="mb-4 break-inside-avoid">
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

          <!-- 目标配置侧边栏 -->
          <USlideover
            v-model:open="drawerVisible"
            :title="
              selectTarget
                ? `目标配置 · ${selectTarget.targetId || selectTarget.id}`
                : ''
            "
          >
            <template #body>
              <div v-if="selectTarget">
                <UFormField label="是否开启此目标的通知" required>
                  <USwitch
                    v-model="selectTarget.config.NotifyConfigSchema.enabled"
                  />
                </UFormField>
              </div>
            </template>
          </USlideover>

          <USeparator class="my-4" />
          <div class="flex justify-end gap-2">
            <UButton
              color="neutral"
              variant="subtle"
              :disabled="!isDirty"
              :loading="isAnyLoading"
              @click="cancelChanges"
            >
              取消
            </UButton>
            <UButton
              :disabled="!isDirty"
              :loading="isAnyLoading"
              @click="handleSubmit"
            >
              保存设置
            </UButton>
          </div>
        </UContainer>
      </template>
    </UDashboardPanel>
  </div>
</template>

<script lang="ts" setup>
import { isEqual, differenceWith, pick } from "lodash-es";
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

import ServerHeader from "@/components/header/server-header.vue";
import { useIsMobile } from "@/composables/is-mobile";
import { NotifyData, ServerData } from "~/composables/api";
import {
  createVariablesArray,
  createVariableMap,
} from "~/composables/use-placeholder-variables";

const isMobile = useIsMobile();

definePageMeta({ layout: "default" });

const { setPageState, clearPageState } = usePageStateStore();
const route = useRoute();
const toast = useToast();
const router = useRouter();

interface FormState {
  config: z.infer<typeof NotifyConfigSchema>;
  targets: targetResponse[];
}

const formData = reactive<FormState>({
  config: NotifyConfigSchema.parse({}),
  targets: [],
});

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
    toast.add({ color: "error", title: "刷新服务器数据失败" });
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
