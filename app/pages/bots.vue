<script lang="ts" setup>
import { cloneDeep } from "lodash-es";
import type { z } from "zod";
import { BotAPI } from "~~/shared/model/bot/api";

import type { BotsWithStatus, BotWithStatus } from "#shared/model/bot/api";
import PageHeader from "@/components/header/page-header.vue";
import SelectorBot from "@/components/selector/bot.vue";
import CardBot from "~/components/card/bot.vue";
import DrawerBot from "~/components/drawer/bot.vue";
import { BotData } from "~/composables/api";

const createEmptyForm = (): Partial<z.infer<typeof BotAPI.POST.request>> => ({
  config: undefined,
  name: undefined,
  platform: undefined,
});

const formData =
  ref<Partial<z.infer<typeof BotAPI.POST.request>>>(createEmptyForm());
const isSubmitting = ref(false);
const toast = useToast();
const showModal = ref(false);

const formRef = useTemplateRef<InstanceType<typeof SelectorBot>>("formRef");

const openModal = () => {
  formData.value = createEmptyForm();
  showModal.value = true;
};

// 机器人列表逻辑
const botList = ref<BotsWithStatus | null>(null);
const isLoadingList = ref(false);

const fetchBotList = async () => {
  isLoadingList.value = true;
  try {
    botList.value = await BotData.gets();
  } catch (error) {
    console.error("Failed to fetch bot list:", error);
    botList.value = [];
    toast.add({ color: "error", title: "获取机器人列表失败" });
  } finally {
    isLoadingList.value = false;
  }
};

const handleSubmitClick = async () => {
  if (isSubmitting.value) {
    return;
  }

  try {
    isSubmitting.value = true;

    const parsed = BotAPI.POST.request.parse(formData.value);
    await BotData.post(parsed);
    toast.add({ color: "success", title: "Bot 实例创建成功" });
    showModal.value = false;
    await fetchBotList();
  } catch (error) {
    console.error("Submit failed:", error);
    toast.add({ color: "error", title: "保存配置失败，请稍后再试" });
  } finally {
    isSubmitting.value = false;
  }
};

onMounted(() => {
  fetchBotList();
});

// 组件点击事件 emit
const showDrawer = ref(false);
const selectedBot = ref<BotWithStatus | null>(null);

const handleChildClick = (botID: number) => {
  const bot = botList.value?.find((item) => item.id === botID);
  if (bot) {
    selectedBot.value = bot;
    showDrawer.value = true;
  }
};

const runBotAction = async (
  action: () => Promise<void>,
  successTitle: string,
) => {
  try {
    await action();
    toast.add({ color: "success", title: successTitle });
    showDrawer.value = false;
    await fetchBotList();
  } catch {
    toast.add({ color: "error", title: "操作失败，请检查后端日志" });
  }
};

// 修改
const handleSave = async (
  botID: number,
  bot: z.infer<typeof BotAPI.POST.request>,
) => {
  await runBotAction(() => BotData.put(botID, bot), "Bot 实例更新成功");
};

// 删除
const handleDelete = async (botID: number) => {
  await runBotAction(() => BotData.delete(botID), "Bot 实例删除成功");
};

// 更改
const handleToggle = async (botID: number, enabled: boolean) => {
  await runBotAction(
    () => BotData.postToggle(botID, { enabled }),
    `Bot 实例已${enabled ? "启用" : "禁用"}成功`,
  );
};
</script>
<template>
  <div class="h-full">
    <UDashboardPanel
      class="scrollbar-custom h-full"
      :ui="{ body: 'p-0 sm:p-0 overflow-y-auto overscroll-none' }"
    >
      <template #header>
        <PageHeader
          title="Bot 实例列表"
          description="管理多个 Bot 实例，点击进入详细配置。"
        >
          <template #actions>
            <UButton icon="i-lucide-plus" @click="openModal"
              >创建新 Bot 实例</UButton
            >
          </template>
        </PageHeader>
      </template>
      <template #body>
        <UContainer class="py-8">
          <UModal v-model:open="showModal" title="创建 Bot 实例">
            <template #body>
              <SelectorBot
                ref="formRef"
                @submit="handleSubmitClick"
                v-model="formData"
              />
            </template>
            <template #footer>
              <div class="flex justify-end gap-2">
                <UButton
                  color="neutral"
                  variant="subtle"
                  :disabled="isSubmitting"
                  @click="showModal = false"
                >
                  取消
                </UButton>
                <UButton
                  :loading="isSubmitting"
                  :disabled="isSubmitting"
                  @click="formRef?.submit()"
                >
                  确认创建
                </UButton>
              </div>
            </template>
          </UModal>

          <LoadingState v-if="!botList" />

          <template v-else>
            <div
              v-if="botList.length === 0 && !isLoadingList"
              class="mt-10 flex flex-col items-center gap-4 text-center"
            >
              <p class="text-muted text-sm">
                暂无 Bot 实例，请先创建一个 Bot 实例
              </p>
              <UButton icon="i-lucide-plus" @click="openModal"
                >创建新 Bot 实例</UButton
              >
            </div>

            <div
              v-else
              class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4"
            >
              <CardBot
                v-for="(bot, index) in botList"
                :key="bot.id"
                :botId="bot"
                :data-index="index"
                @click="handleChildClick"
              />
            </div>
          </template>

          <USlideover
            v-model:open="showDrawer"
            side="right"
            title="配置修改"
            description="修改 Bot 实例配置"
          >
            <template #body>
              <DrawerBot
                v-if="selectedBot"
                :bot="cloneDeep(selectedBot)"
                @delete="handleDelete"
                @save="handleSave"
                @toggle="handleToggle"
              />
            </template>
          </USlideover>
        </UContainer>
      </template>
    </UDashboardPanel>
  </div>
</template>
