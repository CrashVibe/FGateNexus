<script lang="ts" setup>
import { LockClosedOutline, LogInOutline } from "@vicons/ionicons5";
import { StatusCodes } from "http-status-codes";
import type { ApiResponse } from "~~/shared/types";

definePageMeta({
  layout: false
});

const message = useMessage();
const router = useRouter();
const isLoading = ref(false);

// 表单数据
const loginForm = reactive({
  password: "",
  twoFactorToken: [] as string[]
});

// 认证状态
const authStatus = ref({
  hasPassword: false,
  has2FA: false,
  isAuthenticated: false
});

// 检查认证状态
const checkAuthRequired = async () => {
  try {
    const response = await $fetch<ApiResponse<typeof authStatus.value>>("/api/auth/status");
    if (response.code === StatusCodes.OK && response.data) {
      authStatus.value = response.data;

      if (!authStatus.value.hasPassword) {
        // 没有设置密码，直接跳转到首页
        router.push("/");
        return;
      }

      if (authStatus.value.isAuthenticated) {
        // 已经登录，跳转到首页
        router.push("/");
        return;
      }
    }
  } catch (error) {
    console.error("Failed to check auth status:", error);
  }
};

// 登录
const handleLogin = async () => {
  try {
    isLoading.value = true;

    const tokenString = loginForm.twoFactorToken.join("");
    await $fetch<ApiResponse<void>>("/api/auth/login", {
      method: "POST",
      body: {
        password: loginForm.password,
        twoFactorToken: tokenString || undefined
      }
    });

    message.success("登录成功");
    router.push("/");
  } catch (error) {
    console.error("Login failed:", error);
    message.error("登录失败");
  } finally {
    isLoading.value = false;
  }
};

onMounted(() => {
  checkAuthRequired();
});
</script>

<template>
  <div class="flex items-center justify-center min-h-[calc(100vh-var(--header-height))]">
    <n-card class="w-full max-w-md">
      <template #header>
        <div class="flex items-center gap-2">
          <n-icon :component="LockClosedOutline" />
          <span>登录验证</span>
        </div>
      </template>

      <n-spin :show="isLoading">
        <n-space vertical size="large">
          <n-alert type="info">此实例已启用密码保护，请输入密码以继续访问。</n-alert>

          <n-form @submit.prevent="handleLogin">
            <n-form-item label="密码">
              <n-input
                v-model:value="loginForm.password"
                type="password"
                placeholder="输入密码"
                show-password-on="click"
                :disabled="isLoading"
                @keydown.enter="handleLogin"
              />
            </n-form-item>

            <n-form-item v-if="authStatus.has2FA" label="双重验证码">
              <n-input-otp v-model:value="loginForm.twoFactorToken" :length="6" block :disabled="isLoading" />
            </n-form-item>
          </n-form>

          <n-space vertical>
            <n-button type="primary" block :loading="isLoading" @click="handleLogin">
              <template #icon>
                <n-icon :component="LogInOutline" />
              </template>
              登录
            </n-button>
          </n-space>
        </n-space>
      </n-spin>
    </n-card>
  </div>
</template>
