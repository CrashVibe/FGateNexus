<script lang="ts" setup>
import { v4 as uuidv4 } from "uuid";
import type { z } from "zod";
import type { ServerWithStatus } from "~~/shared/schemas/server/servers";

import { ServersAPI } from "#shared/schemas/server/servers";
import PageHeader from "@/components/header/page-header.vue";
import { ServerData } from "~/composables/api";

type FormData = z.infer<(typeof ServersAPI)["POST"]["request"]>;

const formData = ref<FormData>(
  ServersAPI.POST.request.parse({ token: uuidv4() }),
);

const isSubmitting = ref(false);
const toast = useToast();
const showModal = ref(false);

// 服务器列表逻辑
const serverList = ref<ServerWithStatus[]>([]);
const isLoadingList = ref(false);

const fetchServerList = async () => {
  try {
    isLoadingList.value = true;
    serverList.value = await ServerData.gets();
  } catch (error) {
    console.error("Failed to fetch server list:", error);
    toast.add({ color: "error", title: "获取服务器列表失败" });
  } finally {
    isLoadingList.value = false;
  }
};

const openModal = () => {
  formData.value = ServersAPI.POST.request.parse({ token: uuidv4() });
  showModal.value = true;
};

const handleSubmit = async () => {
  try {
    isSubmitting.value = true;
    await ServerData.post(formData.value);
    toast.add({ color: "success", title: "服务器创建成功～" });
    showModal.value = false;
    await fetchServerList();
  } catch (error) {
    console.error("Submit failed:", error);
    toast.add({ color: "error", title: "保存配置失败，请稍后再试" });
  } finally {
    isSubmitting.value = false;
  }
};

const generateToken = () => {
  formData.value.token = uuidv4();
};

onMounted(() => {
  fetchServerList();
});
</script>

<template>
  <div class="h-full">
    <UDashboardPanel
      class="scrollbar-custom h-full"
      :ui="{ body: 'p-0 sm:p-0 overflow-y-auto overscroll-none' }"
    >
      <template #header>
        <PageHeader
          title="服务器列表"
          description="管理你的服务器，点击卡片进入详细配置"
        >
          <template #actions>
            <UButton icon="i-lucide-plus" @click="openModal"
              >创建服务器</UButton
            >
          </template>
        </PageHeader>
      </template>
      <template #body>
        <UContainer class="py-8">
          <!-- 创建服务器弹窗 -->
          <UModal v-model:open="showModal" title="创建服务器">
            <template #body>
              <UForm
                :schema="ServersAPI.POST.request"
                :state="formData"
                class="space-y-4"
                @submit="handleSubmit"
              >
                <UFormField label="服务器名字" name="servername">
                  <UInput
                    v-model="formData.servername"
                    class="w-full"
                    placeholder="请输入服务器名称"
                  />
                </UFormField>
                <UFormField label="Token" name="token">
                  <div class="flex w-full gap-2">
                    <UTooltip :delay-duration="0" class="flex-1">
                      <template #content>
                        <span
                          >这是用于区分不同服务器的密钥，用来识别和验证服务器身份。请妥善保管，不要泄露给他人。<br /><del
                            >泄漏服务器就等着艾草吧（bushi</del
                          ></span
                        >
                      </template>
                      <UInput
                        v-model="formData.token"
                        class="w-full"
                        placeholder="请输入服务器の秘密 Token"
                      />
                    </UTooltip>
                    <UButton
                      color="neutral"
                      variant="subtle"
                      @click="generateToken"
                    >
                      随机生成
                    </UButton>
                  </div>
                </UFormField>
              </UForm>
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
                  @click="handleSubmit"
                >
                  确认创建
                </UButton>
              </div>
            </template>
          </UModal>

          <!-- 空状态 -->
          <div
            v-if="serverList.length === 0 && !isLoadingList"
            class="mt-10 flex flex-col items-center gap-4 text-center"
          >
            <p class="text-muted text-sm">暂无服务器，请先创建一个服务器</p>
            <UButton icon="i-lucide-plus" @click="openModal"
              >创建服务器</UButton
            >
          </div>

          <!-- 服务器卡片列表 -->
          <div
            v-else
            class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4"
          >
            <CardServer
              v-for="(server, index) in serverList"
              :key="server.id"
              :data-index="index"
              :server="server"
            />
          </div>
        </UContainer>
      </template>
    </UDashboardPanel>
  </div>
</template>
