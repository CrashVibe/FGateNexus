<template>
  <div class="h-full">
    <UDashboardPanel
      class="scrollbar-custom h-full"
      :ui="{ body: 'p-0 sm:p-0 overflow-y-auto overscroll-none' }"
    >
      <template #header>
        <ServerHeader />
        <UTabs
          v-model="activeTab"
          :content="false"
          :items="tabItems"
          variant="link"
        />
      </template>
      <template #body>
        <UContainer class="py-8">
          <UForm
            ref="form"
            :schema="chatSyncConfigSchema"
            :state="formData.config"
            @submit="onFormSubmit"
          >
            <!-- Tab 1: 基础配置 -->
            <div
              v-show="activeTab === 'basic'"
              class="grid gap-4"
              :class="isMobile ? 'grid-cols-1' : 'grid-cols-2'"
            >
              <!-- 开关状态总览 -->
              <UPageCard variant="outline">
                <template #title>
                  <div class="flex items-center gap-2">
                    <span>聊天同步总开关</span>
                    <UBadge
                      :color="formData.config.enabled ? 'success' : 'neutral'"
                      variant="subtle"
                    >
                      {{ formData.config.enabled ? "已启用" : "未启用" }}
                    </UBadge>
                  </div>
                </template>
                <template #description>
                  <span class="text-muted text-sm"
                    >控制聊天同步功能的启用状态及消息方向</span
                  >
                </template>
                <template #footer>
                  <div class="flex flex-col gap-4">
                    <UFormField name="enabled" label="启用聊天同步">
                      <USwitch v-model="formData.config.enabled" />
                    </UFormField>
                    <USeparator />
                    <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <UFormField
                        name="mcToPlatformEnabled"
                        label="MC → 平台"
                        description="将 Minecraft 聊天消息转发至平台"
                      >
                        <USwitch
                          v-model="formData.config.mcToPlatformEnabled"
                          :disabled="!formData.config.enabled"
                        />
                      </UFormField>
                      <UFormField
                        name="platformToMcEnabled"
                        label="平台 → MC"
                        description="将平台消息转发至 Minecraft"
                      >
                        <USwitch
                          v-model="formData.config.platformToMcEnabled"
                          :disabled="!formData.config.enabled"
                        />
                      </UFormField>
                    </div>
                  </div>
                </template>
              </UPageCard>

              <!-- 消息过滤 -->
              <UPageCard variant="outline">
                <template #title>消息过滤</template>
                <template #description>
                  <span class="text-muted text-sm"
                    >配置消息长度限制和内容过滤规则</span
                  >
                </template>
                <template #footer>
                  <div class="flex flex-col gap-4">
                    <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <UFormField
                        name="filters.minMessageLength"
                        label="最小长度"
                      >
                        <UInputNumber
                          v-model="formData.config.filters.minMessageLength"
                          class="w-full"
                          placeholder="最小消息字符数"
                        />
                      </UFormField>
                      <UFormField
                        name="filters.maxMessageLength"
                        label="最大长度"
                      >
                        <UInputNumber
                          v-model="formData.config.filters.maxMessageLength"
                          class="w-full"
                          placeholder="最大消息字符数"
                        />
                      </UFormField>
                    </div>
                    <UFormField
                      name="filters.filterMode"
                      label="过滤模式"
                      description="黑名单：转发全部消息但屏蔽指定内容；白名单：仅转发匹配的消息"
                    >
                      <URadioGroup
                        v-model="formData.config.filters.filterMode"
                        :items="[
                          { label: '黑名单模式', value: 'blacklist' },
                          { label: '白名单模式', value: 'whitelist' },
                        ]"
                        orientation="horizontal"
                      />
                    </UFormField>
                    <USeparator />
                    <template
                      v-if="formData.config.filters.filterMode === 'blacklist'"
                    >
                      <UFormField
                        name="filters.blacklistKeywords"
                        label="屏蔽关键词"
                        description="包含这些关键词的消息将被过滤，不会转发"
                      >
                        <UInput
                          v-model="blacklistKeywordsText"
                          placeholder="用逗号分隔多个关键词，如：广告,刷屏,垃圾"
                          class="w-full"
                        />
                      </UFormField>
                      <UFormField
                        name="filters.blacklistRegex"
                        label="屏蔽正则表达式"
                        description="匹配这些正则表达式的消息将被过滤，不会转发"
                      >
                        <UTextarea
                          v-model="blacklistRegexText"
                          placeholder="用逗号分隔多个正则表达式，如：^/.*,#spam.*"
                          :rows="2"
                          class="w-full"
                        />
                      </UFormField>
                    </template>
                    <template v-else>
                      <UFormField
                        name="filters.whitelistPrefixes"
                        label="允许前缀"
                        description="仅转发以这些前缀开头的消息"
                      >
                        <UInput
                          v-model="whitelistPrefixesText"
                          placeholder="用逗号分隔多个前缀，如：#,!,?"
                          class="w-full"
                        />
                      </UFormField>
                      <UFormField
                        name="filters.whitelistRegex"
                        label="允许正则表达式"
                        description="仅转发匹配这些正则表达式的消息"
                      >
                        <UTextarea
                          v-model="whitelistRegexText"
                          placeholder="用逗号分隔多个正则表达式，如：^#.*,#help.*"
                          :rows="2"
                          class="w-full"
                        />
                      </UFormField>
                    </template>
                  </div>
                </template>
              </UPageCard>
            </div>

            <!-- Tab 2: 消息模板 -->
            <div
              v-show="activeTab === 'templates'"
              class="grid gap-4"
              :class="isMobile ? 'grid-cols-1' : 'grid-cols-2'"
            >
              <!-- MC → 平台模板 -->
              <UPageCard variant="outline">
                <template #title>
                  <div class="flex items-center gap-2">
                    <span>MC → 平台模板</span>
                    <UBadge color="primary" variant="subtle" size="sm"
                      >游戏到平台</UBadge
                    >
                  </div>
                </template>
                <template #description>
                  <span class="text-muted text-sm"
                    >Minecraft 玩家消息发送到平台时的格式</span
                  >
                </template>
                <template #footer>
                  <UFormField name="mcToPlatformTemplate" label="模板内容">
                    <UTextarea
                      v-model="formData.config.mcToPlatformTemplate"
                      placeholder="MC 消息发送到平台的格式模板"
                      class="w-full"
                    />
                    <div class="mt-2 space-y-2">
                      <p class="text-muted text-xs">点击变量插入到模板</p>
                      <div class="flex flex-wrap gap-1">
                        <UTooltip
                          v-for="tag in mcToPlatformVariables"
                          :key="tag.value"
                          :text="`${tag.label} · [${tag.example}]`"
                        >
                          <UBadge
                            :color="
                              formData.config.mcToPlatformTemplate.includes(
                                tag.value,
                              )
                                ? 'primary'
                                : 'neutral'
                            "
                            variant="subtle"
                            class="cursor-pointer"
                            @click="
                              insertPlaceholder(
                                'mcToPlatformTemplate',
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
                        <span class="text-primary">{{
                          mcToPlatformPreview
                        }}</span>
                      </div>
                    </div>
                  </UFormField>
                </template>
              </UPageCard>

              <!-- 平台 → MC 模板 -->
              <UPageCard variant="outline">
                <template #title>
                  <div class="flex items-center gap-2">
                    <span>平台 → MC 模板</span>
                    <UBadge color="success" variant="subtle" size="sm"
                      >平台到游戏</UBadge
                    >
                  </div>
                </template>
                <template #description>
                  <span class="text-muted text-sm"
                    >平台消息发送到 Minecraft 时的格式</span
                  >
                </template>
                <template #footer>
                  <UFormField name="platformToMcTemplate" label="模板内容">
                    <UTextarea
                      v-model="formData.config.platformToMcTemplate"
                      placeholder="平台消息发送到 MC 的格式模板"
                      class="w-full"
                    />
                    <div class="mt-2 space-y-2">
                      <p class="text-muted text-xs">点击变量插入到模板</p>
                      <div class="flex flex-wrap gap-1">
                        <UTooltip
                          v-for="tag in platformToMcVariables"
                          :key="tag.value"
                          :text="`${tag.label} · [${tag.example}]`"
                        >
                          <UBadge
                            :color="
                              formData.config.platformToMcTemplate.includes(
                                tag.value,
                              )
                                ? 'success'
                                : 'neutral'
                            "
                            variant="subtle"
                            class="cursor-pointer"
                            @click="
                              insertPlaceholder(
                                'platformToMcTemplate',
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
                          platformToMcPreview
                        }}</span>
                      </div>
                    </div>
                  </UFormField>
                </template>
              </UPageCard>
            </div>

            <!-- Tab 3: 群聊目标 -->
            <div v-show="activeTab === 'targets'">
              <UPageCard variant="outline">
                <template #title>群聊目标配置</template>
                <template #description>
                  <span class="text-muted text-sm"
                    >针对不同目标群聊进行单独配置</span
                  >
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
                    <UButton icon="i-lucide-settings-2">选择目标配置</UButton>
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
                        @click="
                          router.push(`/servers/${route.params.id}/target`)
                        "
                      >
                        你还没有创建目标哦（去创建）
                      </UButton>
                    </template>
                  </UAlert>
                </template>
              </UPageCard>
            </div>
          </UForm>

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
                <UFormField label="是否开启此目标的聊天同步" required>
                  <USwitch
                    v-model="selectTarget.config.chatSyncConfigSchema.enabled"
                  />
                </UFormField>
              </div>
            </template>
          </USlideover>

          <!-- 操作按钮区 -->
          <USeparator class="my-4" />
          <div class="flex justify-end gap-2">
            <UButton
              color="neutral"
              variant="subtle"
              :disabled="!isDirty"
              :loading="isAnyLoading"
              @click="cancelChanges"
              >取消更改</UButton
            >
            <UButton
              :disabled="!isDirty"
              :loading="isAnyLoading"
              @click="form?.submit()"
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
import type { FormSubmitEvent } from "@nuxt/ui";
import { differenceWith, isEqual, pick } from "lodash-es";
import type { z } from "zod";
import {
  formatMCToPlatformMessage,
  formatPlatformToMCMessage,
} from "~~/shared/utils/chat-sync";
import { pickEditableTarget } from "~~/shared/utils/target";

import type {
  ChatSyncAPI,
  ChatSyncConfig,
} from "#shared/model/server/chat-sync";
import { chatSyncConfigSchema } from "#shared/model/server/chat-sync";
import type { ServerWithStatus } from "#shared/model/server/servers";
import type { targetResponse } from "#shared/model/server/target";
import ServerHeader from "@/components/header/server-header.vue";
import { useIsMobile } from "@/composables/is-mobile";
import { ChatSyncData, ServerData } from "~/composables/api";
import {
  createVariableMap,
  createVariablesArray,
} from "~/composables/use-placeholder-variables";

const isMobile = useIsMobile();

const { setPageState, clearPageState } = usePageStateStore();

export type ChatSyncPatchBody = z.infer<typeof ChatSyncAPI.PATCH.request>;

definePageMeta({ layout: "default" });

const tabItems = [
  { icon: "i-lucide-settings", label: "基础配置", value: "basic" },
  { icon: "i-lucide-message-square", label: "消息模板", value: "templates" },
  { icon: "i-lucide-users", label: "群聊目标", value: "targets" },
];

const activeTab = ref("basic");

const route = useRoute();
const router = useRouter();
const toast = useToast();
const form = useTemplateRef("form");
const formData = reactive<FormState>({
  config: chatSyncConfigSchema.parse({}),
  targets: [],
});

const createArrayTextComputed = (
  key:
    | "blacklistKeywords"
    | "blacklistRegex"
    | "whitelistPrefixes"
    | "whitelistRegex",
) =>
  computed({
    get: () => (formData.config.filters[key] || []).join(","),
    set: (v: string) => {
      formData.config.filters[key] = v
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
    },
  });

const blacklistKeywordsText = createArrayTextComputed("blacklistKeywords");
const blacklistRegexText = createArrayTextComputed("blacklistRegex");
const whitelistPrefixesText = createArrayTextComputed("whitelistPrefixes");
const whitelistRegexText = createArrayTextComputed("whitelistRegex");

const selectTarget = ref<targetResponse | null>(null);
const drawerVisible = ref(false);
let serverData: ServerWithStatus | null = null;

interface FormState {
  config: ChatSyncConfig;
  targets: targetResponse[];
}

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
  const selected = serverData?.targets.find((t) => t.id === key) || null;
  if (selected) {
    selectTarget.value = pickEditableTarget(selected, formData.targets);
  }
};

// 占位符变量定义
const MC_TO_PLATFORM_VARIABLES_MAP = createVariableMap({
  "{message}": { example: "Hello world!", label: "消息内容" },
  "{playerName}": { example: "Steve", label: "玩家名" },
  "{playerUUID}": { example: "12345678-1234-1234...", label: "玩家 UUID" },
  "{serverName}": { example: "", label: "服务器名" },
  "{timestamp}": { example: Date.now(), label: "时间戳" },
});

const PLATFORM_TO_MC_VARIABLES_MAP = createVariableMap({
  "{message}": { example: "Hi everyone!", label: "消息内容" },
  "{nickname}": { example: "Alice", label: "昵称" },
  "{platform}": { example: "Onebot", label: "平台名" },
  "{timestamp}": { example: Date.now(), label: "时间戳" },
  "{userId}": { example: "123456789", label: "用户 ID" },
});

const mcToPlatformVariables = computed(() =>
  createVariablesArray(MC_TO_PLATFORM_VARIABLES_MAP),
);
const platformToMcVariables = computed(() =>
  createVariablesArray(PLATFORM_TO_MC_VARIABLES_MAP),
);

const mcToPlatformPreview = computed(() =>
  formatMCToPlatformMessage(formData.config.mcToPlatformTemplate, {
    message: MC_TO_PLATFORM_VARIABLES_MAP["{message}"].example,
    playerName: MC_TO_PLATFORM_VARIABLES_MAP["{playerName}"].example,
    playerUUID: MC_TO_PLATFORM_VARIABLES_MAP["{playerUUID}"].example,
    serverName: serverData?.name ?? "",
    timestamp: MC_TO_PLATFORM_VARIABLES_MAP["{timestamp}"].example,
  }),
);

const platformToMcPreview = computed(() =>
  formatPlatformToMCMessage(formData.config.platformToMcTemplate, {
    message: PLATFORM_TO_MC_VARIABLES_MAP["{message}"].example,
    nickname: PLATFORM_TO_MC_VARIABLES_MAP["{nickname}"].example,
    platform: PLATFORM_TO_MC_VARIABLES_MAP["{platform}"].example,
    timestamp: PLATFORM_TO_MC_VARIABLES_MAP["{timestamp}"].example,
    userId: PLATFORM_TO_MC_VARIABLES_MAP["{userId}"].example,
  }),
);

const insertPlaceholder = (
  field: keyof Pick<
    ChatSyncConfig,
    "mcToPlatformTemplate" | "platformToMcTemplate"
  >,
  placeholder: string,
) => {
  const current = formData.config[field] || "";
  formData.config[field] = current + placeholder;
};

const refreshServerData = async (): Promise<void> => {
  if (!route.params?.id) {
    return;
  }
  loadingMap.isLoading = true;
  try {
    const data = await ServerData.get(Number(route.params["id"]));
    serverData = data;
    formData.config = structuredClone(data.chatSyncConfig);
    formData.targets = structuredClone(data.targets);
    originalFormData.value = structuredClone(toRaw(formData));
    options.value = data.targets.map((target) => ({
      key: target.id,
      label: target.targetId,
    }));
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

  const targetsPayload: z.infer<typeof ChatSyncAPI.PATCH.request>["targets"] =
    differenceWith(
      formData.targets,
      originalFormData.value?.targets || [],
      isEqual,
    ).map((t) => pick(t, ["id", "config"]));

  loadingMap.isSubmitting = true;
  try {
    await ChatSyncData.patch(Number(route.params["id"]), {
      chatsync: formData.config,
      targets: targetsPayload,
    });
    toast.add({ color: "success", title: "消息同步配置已保存" });
    selectTarget.value = null;
    await refreshServerData();
  } catch (error) {
    console.error("Submit failed:", error);
  } finally {
    loadingMap.isSubmitting = false;
  }
};
type ChatSyncConfigOutput = z.output<typeof chatSyncConfigSchema>;

const onFormSubmit = async (event: FormSubmitEvent<ChatSyncConfigOutput>) => {
  formData.config = event.data;
  await handleSubmit();
};

const cancelChanges = () => {
  if (originalFormData.value) {
    formData.config = structuredClone(toRaw(originalFormData.value.config));
    formData.targets = structuredClone(toRaw(originalFormData.value.targets));
  } else {
    formData.config = chatSyncConfigSchema.parse({});
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
