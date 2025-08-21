<script lang="ts" setup>
import { AddCircleOutline, RefreshOutline } from "@vicons/ionicons5";
import { v4 as uuidv4 } from "uuid";
import { zodToNaiveRules } from "#shared/utils/validation";
import {
  serverSchemaRequset,
  type serverSchemaRequsetType,
  type ServerWithStatus
} from "#shared/schemas/server/servers";
import type { FormInst } from "naive-ui";
import type { ApiResponse, ApiResponseType } from "~~/shared/types";
import { StatusCodes } from "http-status-codes";

const formRef = ref<FormInst>();
const formData = ref<serverSchemaRequsetType>({
  servername: "",
  token: ""
});
const isSubmitting = ref(false);
const message = useMessage();
const rules = zodToNaiveRules(serverSchemaRequset);
const showModal = ref(false);

function openModal() {
  showModal.value = true;
  formData.value = {
    servername: "",
    token: ""
  };
}

async function handleSubmitClick(e: MouseEvent) {
  e.preventDefault();

  try {
    isSubmitting.value = true;

    try {
      await formRef.value?.validate();
    } catch {
      isSubmitting.value = false;
      return;
    }

    await $fetch<ApiResponseType>("/api/servers", {
      method: "POST",
      body: formData.value
    });

    message.success("服务器创建成功");
    showModal.value = false;
    // 刷新
    await fetchServerList();
  } catch (error) {
    console.error("Submit failed:", error);
    message.error("服务器创建失败");
  } finally {
    isSubmitting.value = false;
  }
}

function generateToken() {
  formData.value.token = uuidv4();
}

// 服务器列表逻辑
const serverList = ref<ServerWithStatus[]>([]);
const isLoadingList = ref(false);

async function fetchServerList() {
  try {
    isLoadingList.value = true;
    const response = await $fetch<ApiResponse<ServerWithStatus[]>>("/api/servers");
    if (response.code === StatusCodes.OK && response.data) {
      serverList.value = response.data;
    } else {
      message.error("获取服务器列表失败");
    }
  } catch (error) {
    console.error("Failed to fetch server list:", error);
    message.error("获取服务器列表失败");
  } finally {
    isLoadingList.value = false;
  }
}

async function handleRefresh() {
  await fetchServerList();
}

onMounted(() => {
  fetchServerList();
});
</script>
<template>
  <div class="flex flex-col h-full gap-3">
    <!-- head -->
    <div>
      <!-- text 区 -->
      <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <n-text class="flex flex-col gap-2" strong>
          <h1 class="text-2xl sm:text-3xl">服务器列表</h1>
          <p class="text-sm text-gray-400 sm:text-base">管理你的服务器，点击卡片进入详细配置</p>
        </n-text>
        <div class="flex flex-wrap gap-2 sm:gap-3">
          <n-button :loading="isLoadingList" size="large" strong @click="handleRefresh">
            刷新列表
            <template #icon>
              <n-icon :component="RefreshOutline" />
            </template>
          </n-button>
          <n-button ghost size="large" type="primary" @click="openModal">
            创建服务器
            <template #icon>
              <n-icon :component="AddCircleOutline" />
            </template>
          </n-button>
        </div>
      </div>
    </div>
    <!-- modal 创建区 -->
    <div>
      <n-modal v-model:show="showModal" class="w-[90vw] max-w-[600px]" preset="card" title="创建服务器">
        <n-form ref="formRef" :model="formData" :rules="rules">
          <n-form-item label="服务器名字" path="servername">
            <n-input v-model:value="formData.servername" placeholder="请输入服务器名称" />
          </n-form-item>
          <n-form-item label="Token" path="token">
            <n-input-group>
              <n-tooltip show-arrow trigger="focus">
                <template #trigger>
                  <n-input v-model:value="formData.token" placeholder="请输入服务器の秘密 Token"></n-input>
                </template>
                这是用于区分不同服务器的密钥，用来识别和验证服务器身份。
                <br />
                请妥善保管，不要泄露给他人。
                <br />
                <n-text class="text-gray-400" delete size="small">泄漏服务器就等着艾草吧（逃</n-text>
              </n-tooltip>
              <n-button @click="generateToken()">随机生成</n-button>
            </n-input-group>
          </n-form-item>
        </n-form>
        <template #action>
          <div class="flex justify-end gap-2">
            <n-button :disabled="isSubmitting" @click="showModal = false">取消</n-button>
            <n-button :disabled="isSubmitting" :loading="isSubmitting" ghost type="primary" @click="handleSubmitClick">
              确认创建
            </n-button>
          </div>
        </template>
      </n-modal>
    </div>
    <!-- Content -->
    <div class="flex-1">
      <n-empty v-if="serverList.length === 0" class="mt-6 sm:mt-10" description="暂无服务器，请先创建一个服务器">
        <template #extra>
          <n-button size="medium" type="primary" @click="openModal">
            创建服务器
            <template #icon>
              <n-icon :component="AddCircleOutline" />
            </template>
          </n-button>
        </template>
      </n-empty>
      <n-grid :cols="isMobile ? 1 : '600:2 1100:3 1600:4'" x-gap="16" y-gap="16">
        <n-gi v-for="(server, index) in serverList || []" :key="serverList.indexOf(server)">
          <CardServer :data-index="index" :server="server" />
        </n-gi>
      </n-grid>
    </div>
  </div>
</template>
