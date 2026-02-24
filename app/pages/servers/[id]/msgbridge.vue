<template>
  <div>
    <ServerHeader class="mb-3" />

    <n-form ref="formRef" :model="formData" :rules="rules">
      <!-- 基础配置区域 -->
      <n-grid :cols="isMobile ? 1 : '2'" x-gap="12" y-gap="12">
        <n-grid-item>
          <!-- 基础设置 -->
          <n-card class="h-full" size="small" title="基础设置">
            <template #header-extra>
              <n-tag :type="formData.config.enabled ? 'success' : 'default'" round size="small">
                {{ formData.config.enabled ? "已启用" : "未启用" }}
              </n-tag>
            </template>

            <n-form-item label="启用聊天同步" path="enabled">
              <n-switch v-model:value="formData.config.enabled" />
            </n-form-item>
            <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
              <n-form-item label="MC → 平台" path="mcToPlatformEnabled">
                <n-switch v-model:value="formData.config.mcToPlatformEnabled" :disabled="!formData.config.enabled" />
              </n-form-item>

              <n-form-item label="平台 → MC" path="platformToMcEnabled">
                <n-switch v-model:value="formData.config.platformToMcEnabled" :disabled="!formData.config.enabled" />
              </n-form-item>
            </div>
          </n-card>
        </n-grid-item>
        <n-grid-item>
          <!-- 消息过滤配置 -->
          <n-card class="h-full" size="small" title="消息过滤">
            <n-grid :cols="isMobile ? 1 : '2'" x-gap="12" y-gap="12">
              <n-grid-item>
                <n-form-item label="最小长度" path="filters.minMessageLength">
                  <n-input-number
                    v-model:value="formData.config.filters.minMessageLength"
                    :max="1000"
                    :min="0"
                    class="w-full"
                    placeholder="最小消息字符数"
                  />
                </n-form-item>
              </n-grid-item>
              <n-grid-item>
                <n-form-item label="最大长度" path="filters.maxMessageLength">
                  <n-input-number
                    v-model:value="formData.config.filters.maxMessageLength"
                    :max="5000"
                    :min="1"
                    class="w-full"
                    placeholder="最大消息字符数"
                  />
                </n-form-item>
              </n-grid-item>
            </n-grid>

            <n-form-item label="过滤模式" path="filters.filterMode">
              <n-radio-group v-model:value="formData.config.filters.filterMode">
                <n-space>
                  <n-radio value="blacklist">黑名单模式</n-radio>
                  <n-radio value="whitelist">白名单模式</n-radio>
                </n-space>
              </n-radio-group>
              <template #feedback>
                <div class="text-sm text-gray-500">
                  黑名单模式：转发全部消息但屏蔽指定内容
                  <br />
                  白名单模式：仅转发匹配的消息
                </div>
              </template>
            </n-form-item>

            <!-- 黑名单模式配置 -->
            <template v-if="formData.config.filters.filterMode === 'blacklist'">
              <n-form-item label="屏蔽关键词" path="filters.blacklistKeywords">
                <n-input
                  v-model:value="blacklistKeywordsText"
                  :maxlength="200"
                  placeholder="用逗号分隔多个关键词，如：广告,刷屏,垃圾"
                  show-count
                />
                <template #feedback>
                  <div class="text-sm text-gray-500">包含这些关键词的消息将被过滤，不会转发</div>
                </template>
              </n-form-item>

              <n-form-item label="屏蔽正则表达式" path="filters.blacklistRegex">
                <n-input
                  v-model:value="blacklistRegexText"
                  :maxlength="500"
                  placeholder="用逗号分隔多个正则表达式，如：^/.*,#spam.*"
                  show-count
                  type="textarea"
                  :rows="2"
                />
                <template #feedback>
                  <div class="text-sm text-gray-500">匹配这些正则表达式的消息将被过滤，不会转发</div>
                </template>
              </n-form-item>
            </template>

            <!-- 白名单模式配置 -->
            <template v-else>
              <n-form-item label="允许前缀" path="filters.whitelistPrefixes">
                <n-input
                  v-model:value="whitelistPrefixesText"
                  :maxlength="200"
                  placeholder="用逗号分隔多个前缀，如：#,!,?"
                  show-count
                />
                <template #feedback>
                  <div class="text-sm text-gray-500">仅转发以这些前缀开头的消息</div>
                </template>
              </n-form-item>

              <n-form-item label="允许正则表达式" path="filters.whitelistRegex">
                <n-input
                  v-model:value="whitelistRegexText"
                  :maxlength="500"
                  placeholder="用逗号分隔多个正则表达式，如：^#.*,#help.*"
                  show-count
                  type="textarea"
                  :rows="2"
                />
                <template #feedback>
                  <div class="text-sm text-gray-500">仅转发匹配这些正则表达式的消息</div>
                </template>
              </n-form-item>
            </template>
          </n-card>
        </n-grid-item>
      </n-grid>

      <!-- 消息模板配置 -->
      <div class="mt-3">
        <n-card size="small" title="消息模板配置">
          <n-grid :cols="isMobile ? 1 : '2'" x-gap="12" y-gap="12">
            <n-grid-item>
              <!-- MC → 平台模板 -->
              <n-card embedded size="small">
                <template #header>
                  <div class="flex items-center gap-2">
                    <span>MC → 平台模板</span>
                    <n-tag size="small" type="primary">游戏到平台</n-tag>
                  </div>
                </template>

                <n-form-item label="模板内容" label-placement="top" path="mcToPlatformTemplate">
                  <n-input
                    v-model:value="formData.config.mcToPlatformTemplate"
                    :maxlength="200"
                    :rows="3"
                    placeholder="MC 消息发送到平台的格式模板"
                    show-count
                    type="textarea"
                  />
                  <template #feedback>
                    <div class="mt-2 space-y-2">
                      <div class="flex flex-wrap gap-1">
                        <n-tooltip v-for="tag in mcToPlatformVariables" :key="tag.value" trigger="hover">
                          <template #trigger>
                            <n-tag
                              :type="formData.config.mcToPlatformTemplate.includes(tag.value) ? 'primary' : 'default'"
                              class="cursor-pointer"
                              size="small"
                              @click="insertPlaceholder('mcToPlatformTemplate', tag.value)"
                            >
                              {{ tag.value }}
                            </n-tag>
                          </template>
                          {{ tag.label }} · [{{ tag.example }}]
                        </n-tooltip>
                      </div>
                      <div class="text-sm text-gray-500">
                        预览：
                        <n-text type="info">{{ mcToPlatformPreview }}</n-text>
                      </div>
                    </div>
                  </template>
                </n-form-item>
              </n-card>
            </n-grid-item>
            <n-grid-item>
              <!-- 平台 → MC 模板 -->
              <n-card embedded size="small">
                <template #header>
                  <div class="flex items-center gap-2">
                    <span>平台 → MC 模板</span>
                    <n-tag size="small" type="success">平台到游戏</n-tag>
                  </div>
                </template>

                <n-form-item label="模板内容" label-placement="top" path="platformToMcTemplate">
                  <n-input
                    v-model:value="formData.config.platformToMcTemplate"
                    :maxlength="200"
                    :rows="3"
                    placeholder="平台消息发送到 MC 的格式模板"
                    show-count
                    type="textarea"
                  />
                  <template #feedback>
                    <div class="mt-2 space-y-2">
                      <div class="flex flex-wrap gap-1">
                        <n-tooltip v-for="tag in platformToMcVariables" :key="tag.value" trigger="hover">
                          <template #trigger>
                            <n-tag
                              :type="formData.config.platformToMcTemplate.includes(tag.value) ? 'success' : 'default'"
                              class="cursor-pointer"
                              size="small"
                              @click="insertPlaceholder('platformToMcTemplate', tag.value)"
                            >
                              {{ tag.value }}
                            </n-tag>
                          </template>
                          {{ tag.label }} · [{{ tag.example }}]
                        </n-tooltip>
                      </div>
                      <div class="text-sm text-gray-500">
                        预览：
                        <n-text type="success">{{ platformToMcPreview }}</n-text>
                      </div>
                    </div>
                  </template>
                </n-form-item>
              </n-card>
            </n-grid-item>
          </n-grid>
        </n-card>
      </div>
    </n-form>

    <div class="mt-3">
      <n-grid :cols="isMobile ? 1 : '2'" x-gap="12" y-gap="12" class="mb-3">
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
    </div>

    <n-drawer v-model:show="drawerVisible" :width="502">
      <n-drawer-content v-if="selectTarget" closable :title="`目标配置 · ${selectTarget.targetId || selectTarget.id}`">
        <n-form :model="selectTarget">
          <n-form-item label="是否开启此目标的聊天同步" required>
            <n-switch v-model:value="selectTarget.config.chatSyncConfigSchema.enabled" />
          </n-form-item>
        </n-form>
      </n-drawer-content>
    </n-drawer>

    <!-- 操作按钮区 -->
    <n-divider />
    <div class="flex justify-end gap-2">
      <n-button :disabled="!isDirty" :loading="isAnyLoading" @click="cancelChanges">取消更改</n-button>
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
        保存配置
      </n-button>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { isMobile } from "#imports";
import type { FormInst } from "naive-ui";
import type { z } from "zod";
import { ChatSyncData, ServerData } from "~/composables/api";
import { cloneDeep, differenceWith, isEqual, pick } from "lodash-es";
import { chatSyncConfigSchema, type ChatSyncAPI, type ChatSyncConfig } from "~~/shared/schemas/server/chatSync";
import type { targetResponse } from "~~/shared/schemas/server/target";
import { formatMCToPlatformMessage, formatPlatformToMCMessage } from "~~/shared/utils/chatSync";
import { zodToNaiveRules } from "~/composables/useValidation";
import type { ServerWithStatus } from "~~/shared/schemas/server/servers";
import { pickEditableTarget } from "~~/shared/utils/target";
import { createVariablesArray, createVariableMap } from "~/composables/usePlaceholderVariables";
import ServerHeader from "~/components/Header/ServerHeader.vue";

const { setPageState, clearPageState } = usePageStateStore();

export type ChatSyncPatchBody = z.infer<typeof ChatSyncAPI.PATCH.request>;

definePageMeta({ layout: "default" });

const route = useRoute();
const router = useRouter();
const message = useMessage();
const formRef = ref<FormInst>();
const formData = reactive<FormState>({
  config: chatSyncConfigSchema.parse({}),
  targets: []
});
const rules = zodToNaiveRules(chatSyncConfigSchema);

function createArrayTextComputed(key: "blacklistKeywords" | "blacklistRegex" | "whitelistPrefixes" | "whitelistRegex") {
  return computed({
    get: () => (formData.config.filters[key] || []).join(","),
    set: (v: string) => {
      formData.config.filters[key] = v
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
    }
  });
}

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
  isSubmitting: false
});

const isDirty = computed(() => !isEqual(formData, originalFormData.value));
const isAnyLoading = computed(() => Object.values(loadingMap).some(Boolean));

const options = ref<{ label: string; key: string }[]>([]);

function handleSelect(key: string) {
  drawerVisible.value = true;
  const selected = serverData?.targets.find((t) => t.id === key) || null;
  if (selected) {
    const editable = pickEditableTarget(selected, formData.targets);
    selectTarget.value = editable;
  }
}

// 占位符变量定义
const MC_TO_PLATFORM_VARIABLES_MAP = createVariableMap({
  "{playerName}": { label: "玩家名", example: "Steve" },
  "{playerUUID}": { label: "玩家 UUID", example: "12345678-1234-1234..." },
  "{message}": { label: "消息内容", example: "Hello world!" },
  "{serverName}": { label: "服务器名", example: "" },
  "{timestamp}": { label: "时间戳", example: new Date().getTime() }
});

const PLATFORM_TO_MC_VARIABLES_MAP = createVariableMap({
  "{platform}": { label: "平台名", example: "Onebot" },
  "{nickname}": { label: "昵称", example: "Alice" },
  "{userId}": { label: "用户 ID", example: "123456789" },
  "{message}": { label: "消息内容", example: "Hi everyone!" },
  "{timestamp}": { label: "时间戳", example: new Date().getTime() }
});

const mcToPlatformVariables = computed(() => createVariablesArray(MC_TO_PLATFORM_VARIABLES_MAP));
const platformToMcVariables = computed(() => createVariablesArray(PLATFORM_TO_MC_VARIABLES_MAP));

const mcToPlatformPreview = computed(() =>
  formatMCToPlatformMessage(formData.config.mcToPlatformTemplate, {
    playerName: MC_TO_PLATFORM_VARIABLES_MAP["{playerName}"].example,
    playerUUID: MC_TO_PLATFORM_VARIABLES_MAP["{playerUUID}"].example,
    message: MC_TO_PLATFORM_VARIABLES_MAP["{message}"].example,
    serverName: serverData?.name ?? "",
    timestamp: MC_TO_PLATFORM_VARIABLES_MAP["{timestamp}"].example
  })
);

const platformToMcPreview = computed(() =>
  formatPlatformToMCMessage(formData.config.platformToMcTemplate, {
    platform: PLATFORM_TO_MC_VARIABLES_MAP["{platform}"].example,
    nickname: PLATFORM_TO_MC_VARIABLES_MAP["{nickname}"].example,
    userId: PLATFORM_TO_MC_VARIABLES_MAP["{userId}"].example,
    message: PLATFORM_TO_MC_VARIABLES_MAP["{message}"].example,
    timestamp: PLATFORM_TO_MC_VARIABLES_MAP["{timestamp}"].example
  })
);

function insertPlaceholder(
  field: keyof Pick<ChatSyncConfig, "mcToPlatformTemplate" | "platformToMcTemplate">,
  placeholder: string
) {
  const current = formData.config[field] || "";
  formData.config[field] = current + placeholder;
}

async function refreshServerData(): Promise<void> {
  if (!route.params?.id) return;
  loadingMap.isLoading = true;
  try {
    const data = await ServerData.get(Number(route.params["id"]));
    serverData = data;
    formData.config = cloneDeep(data.chatSyncConfig);
    formData.targets = cloneDeep(data.targets);
    originalFormData.value = cloneDeep(formData);
    options.value = data.targets.map((target) => ({ label: target.targetId, key: target.id }));
  } catch (error) {
    console.error("Failed to refresh server data:", error);
    message.error("刷新服务器数据失败");
  } finally {
    loadingMap.isLoading = false;
  }
}

async function handleSubmit() {
  if (!isDirty.value) {
    message.info("没有需要保存的更改");
    return;
  }

  try {
    await formRef.value?.validate();
  } catch {
    return;
  }

  const targetsPayload: z.infer<typeof ChatSyncAPI.PATCH.request>["targets"] = differenceWith(
    formData.targets,
    originalFormData.value?.targets || [],
    isEqual
  ).map((t) => pick(t, ["id", "config"]));

  loadingMap.isSubmitting = true;
  try {
    await ChatSyncData.patch(Number(route.params["id"]), { chatsync: formData.config, targets: targetsPayload });
    message.success("消息同步配置已保存");
    selectTarget.value = null;
    await refreshServerData();
  } catch (error) {
    console.error("Submit failed:", error);
  } finally {
    loadingMap.isSubmitting = false;
  }
}

function cancelChanges() {
  if (originalFormData.value) {
    formData.config = cloneDeep(originalFormData.value.config);
    formData.targets = cloneDeep(originalFormData.value.targets);
  } else {
    formData.config = chatSyncConfigSchema.parse({});
    formData.targets = [];
  }
  selectTarget.value = null;
}

onMounted(async () => {
  await refreshServerData();
  setPageState({ isDirty: () => isDirty.value, save: handleSubmit });
});

onUnmounted(() => {
  clearPageState();
});
</script>
