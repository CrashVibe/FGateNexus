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
          <LoadingState v-if="!formReady && !noBotConfigured && !botIsOnline" />

          <template v-else-if="noBotConfigured">
            <div class="flex flex-col items-center gap-4 py-16">
              <p class="text-muted">请先配置 Bot 实例后再管理目标</p>
              <UButton
                :to="`/servers/${serverId}/general`"
                icon="i-lucide-settings"
              >
                前往配置 Bot 实例
              </UButton>
            </div>
          </template>

          <template v-else-if="!botIsOnline">
            <div class="flex flex-col items-center gap-4 py-16">
              <p class="text-muted">
                该页面需要 Bot 实例在线时配置，请确保 Bot 已正确运行
              </p>
              <UButton :to="`/bots`" icon="i-lucide-settings">
                前往检查 Bot 状态
              </UButton>
            </div>
          </template>

          <template v-else-if="formReady">
            <div class="space-y-6">
              <!-- Header -->
              <div>
                <h2 class="text-lg font-semibold">选择目标频道</h2>
                <p class="text-muted mt-1 text-sm">
                  从 Bot 实例中选择要转发消息的群组、频道或私聊
                </p>
              </div>

              <!-- Transfer List -->
              <div v-if="botId && targetPlatform">
                <TargetChannelSelector
                  :bot-id="botId"
                  :platform="targetPlatform"
                  v-model:selected="selectedChannelIds"
                  @loading="(v: boolean) => (loadingMap.isLoadingChannels = v)"
                />
              </div>

              <!-- Action Buttons -->
              <div class="flex justify-end gap-2">
                <UButton
                  color="neutral"
                  variant="subtle"
                  :disabled="!isDirty"
                  :loading="isAnyLoading"
                  @click="cancelChanges"
                >
                  取消更改
                </UButton>
                <UButton
                  :disabled="!isDirty || isAnyLoading"
                  :loading="isAnyLoading"
                  @click="handleSubmit"
                >
                  保存配置
                </UButton>
              </div>
            </div>
          </template>
        </UContainer>
      </template>
    </UDashboardPanel>
  </div>
</template>

<script lang="ts" setup>
import { isEqual } from "lodash-es";
import type { z } from "zod";
import { PlatformType } from "~~/shared/model/bot/types";

import type { targetResponse } from "#shared/model/server/schema/target";
import { targetSchemaRequest } from "#shared/model/server/schema/target";
import ServerHeader from "@/components/header/server-header.vue";
import TargetChannelSelector from "@/components/selector/target/index.vue";
import { BotData, ServerData, TargetData } from "~/composables/api";

const route = useRoute();
const toast = useToast();
const { setPageState, clearPageState } = usePageStateStore();

definePageMeta({ layout: "default" });

const serverId = Number(route.params?.["id"]);
const botId = ref<number | null>(null);
const targetPlatform = ref<PlatformType | null>(null);
const noBotConfigured = ref(false);
const botIsOnline = ref(false);
const formReady = ref(false);

const selectedChannelIds = ref<Set<string>>(new Set());
const originalSelectedIds = ref<Set<string>>(new Set());

const loadingMap = reactive({
  isLoading: true,
  isLoadingChannels: false,
  isSubmitting: false,
});

const isAnyLoading = computed(() => Object.values(loadingMap).some(Boolean));

const isDirty = computed(
  () =>
    !isEqual(
      [...selectedChannelIds.value].toSorted(),
      [...originalSelectedIds.value].toSorted(),
    ),
);

const toSelectionKey = (
  target: Pick<targetResponse, "channelId" | "guildId" | "type">,
) => `${target.type}|${target.guildId ?? ""}|${target.channelId}`;

const parseSelectionKey = (value: string) => {
  const [type, guildId, ...channelIdParts] = value.split("|");
  const channelId = channelIdParts.join("|");
  return {
    channelId,
    guildId: guildId || null,
    type: type === "private" ? "private" : "group",
  } as const;
};

const refreshAll = async (): Promise<void> => {
  if (!serverId) {
    loadingMap.isLoading = false;
    return;
  }

  loadingMap.isLoading = true;
  noBotConfigured.value = false;
  formReady.value = false;

  try {
    const serverData = await ServerData.get(serverId);
    if (!serverData.botId) {
      noBotConfigured.value = true;
      return;
    }

    botId.value = serverData.botId;
    const botData = await BotData.get(serverData.botId);
    botIsOnline.value = botData.isOnline;
    targetPlatform.value = botData.platform;

    const targets = await TargetData.gets(serverId);
    const targetIds = new Set(targets.map((target) => toSelectionKey(target)));
    originalSelectedIds.value = targetIds;
    selectedChannelIds.value = new Set(targetIds);

    formReady.value = true;
  } catch (error) {
    console.error(error);
    toast.add({ color: "error", title: "刷新目标列表失败" });
  } finally {
    loadingMap.isLoading = false;
  }
};

const buildTargetFromSelection = (
  selection: string,
): z.infer<typeof targetSchemaRequest> => {
  const parsed = parseSelectionKey(selection);
  return targetSchemaRequest.parse({
    channelId: parsed.channelId.trim(),
    guildId: parsed.guildId,
    type: parsed.type,
  });
};

const handleSubmit = async () => {
  if (!botId.value) {
    return;
  }

  const toCreate = [...selectedChannelIds.value].filter(
    (id) => !originalSelectedIds.value.has(id),
  );
  const toDelete = [...originalSelectedIds.value].filter(
    (id) => !selectedChannelIds.value.has(id),
  );

  if (toCreate.length === 0 && toDelete.length === 0) {
    return;
  }

  loadingMap.isSubmitting = true;

  try {
    if (toCreate.length > 0) {
      const newTargets = toCreate.map((selection) =>
        buildTargetFromSelection(selection),
      );
      await TargetData.creates(serverId, newTargets);
    }

    if (toDelete.length > 0) {
      const allTargets = await TargetData.gets(serverId);
      const deletedSelectionSet = new Set(toDelete);
      const targetIdsToDelete = allTargets
        .filter((target) => deletedSelectionSet.has(toSelectionKey(target)))
        .map((t) => t.id);

      if (targetIdsToDelete.length > 0) {
        await TargetData.deletes(serverId, { ids: targetIdsToDelete });
      }
    }

    toast.add({ color: "success", title: "配置已保存" });
    await refreshAll();
  } catch (error) {
    console.error("保存失败：", error);
    toast.add({ color: "error", title: "保存配置失败，请稍后再试" });
  } finally {
    loadingMap.isSubmitting = false;
  }
};

const cancelChanges = () => {
  selectedChannelIds.value = new Set(originalSelectedIds.value);
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
