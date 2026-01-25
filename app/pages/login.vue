<script lang="ts" setup>
import { loginBodySchema, type LoginBody } from "#shared/schemas/auth";
import { LockClosedOutline, LogInOutline } from "@vicons/ionicons5";
import { FetchError } from "ofetch";
import type { ApiErrorResponse } from "~~/shared/error";

definePageMeta({
  layout: false
});

const message = useMessage();
const router = useRouter();
const isLoading = ref(false);
const rules = zodToNaiveRules(loginBodySchema);
const { loggedIn, fetch: refreshSession } = useUserSession();

// 表单数据
const credentials = reactive<LoginBody>({
  password: "",
  twoFactorToken: undefined
});

const needsTwoFactor = ref(false);
const twoFactorInput = ref<string[]>([]);

const handleLogin = async () => {
  try {
    isLoading.value = true;

    if (twoFactorInput.value.length > 0) {
      credentials.twoFactorToken = twoFactorInput.value.join("");
    }

    const validation = loginBodySchema.safeParse(credentials);
    if (!validation.success) {
      message.error(validation.error.issues[0]?.message || "请求参数错误");
      return;
    }

    await $fetch("/api/auth/login", {
      method: "POST",
      body: validation.data
    });
    await refreshSession();
    message.success("登录成功");
    router.push("/");
  } catch (error: unknown) {
    console.error("Login failed:", error);

    const errorMessage =
      error instanceof FetchError ? (error.data as ApiErrorResponse).message : "无效的凭据，请重试。";

    if (errorMessage.includes("2FA") || errorMessage.includes("双重")) {
      needsTwoFactor.value = true;
    }

    message.error(errorMessage);
  } finally {
    isLoading.value = false;
  }
};

onMounted(async () => {
  if (loggedIn.value) {
    router.push("/");
  }
});
</script>

<template>
  <div class="flex min-h-[calc(100vh-var(--header-height))] items-center justify-center">
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

          <n-form :model="credentials" :rules="rules" label-width="80px" @submit.prevent="handleLogin">
            <n-form-item label="密码">
              <n-input
                v-model:value="credentials.password"
                type="password"
                placeholder="输入密码"
                show-password-on="click"
                :disabled="isLoading"
                @keydown.enter="handleLogin"
              />
            </n-form-item>

            <n-form-item v-if="needsTwoFactor" label="双重验证码">
              <n-input-otp v-model:value="twoFactorInput" :length="6" block :disabled="isLoading" />
            </n-form-item>
          </n-form>

          <n-space vertical>
            <n-button
              type="primary"
              block
              :loading="isLoading"
              :disabled="!credentials.password || isLoading"
              @click="handleLogin"
            >
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
