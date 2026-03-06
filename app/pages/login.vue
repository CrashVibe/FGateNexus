<script lang="ts" setup>
import { FetchError } from "ofetch";
import type { ApiErrorResponse } from "~~/shared/error";
import { LoginAPI } from "~~/shared/schemas/auth";
import type { LoginBody } from "~~/shared/schemas/auth";

import { useAuthStore } from "#imports";

definePageMeta({
  layout: false,
});

const toast = useToast();
const router = useRouter();
const authStore = useAuthStore();
const isLoading = ref(false);

const credentials = reactive<LoginBody>({
  password: "",
  twoFactorToken: undefined,
});

const twoFactorInput = ref<string[]>([]);

const handleLogin = async () => {
  try {
    isLoading.value = true;

    if (twoFactorInput.value.length > 0) {
      credentials.twoFactorToken = twoFactorInput.value.join("");
    }

    const validation = LoginAPI.POST.request.safeParse(credentials);
    if (!validation.success) {
      toast.add({
        color: "error",
        title: validation.error.issues[0]?.message || "请求参数错误",
      });
      return;
    }

    await authStore.login(validation.data);
    toast.add({ color: "success", title: "登录成功" });
    router.push("/");
  } catch (error: unknown) {
    console.error("Login failed:", error);

    const errorMessage =
      error instanceof FetchError
        ? (error.data as ApiErrorResponse).message
        : "无效的凭据，请重试。";

    if (errorMessage.includes("2FA") || errorMessage.includes("双重")) {
      await authStore.requireAuth();
    }

    toast.add({ color: "error", title: errorMessage });
  } finally {
    isLoading.value = false;
  }
};

onMounted(async () => {
  if (!(await authStore.requireAuth())) {
    router.push("/");
  }
});
</script>

<template>
  <div
    class="flex h-screen min-h-[calc(100vh-var(--header-height))] items-center justify-center"
  >
    <UCard class="w-full max-w-md">
      <template #header>
        <div class="flex items-center gap-2">
          <UIcon name="i-lucide-lock" />
          <span>登录验证</span>
        </div>
      </template>

      <div class="flex flex-col gap-4">
        <UAlert
          color="info"
          variant="soft"
          title="此实例已启用密码保护，请输入密码以继续访问。"
        />

        <UFormField label="密码">
          <UInput
            v-model="credentials.password"
            class="w-full"
            type="password"
            placeholder="输入密码"
            :disabled="isLoading"
            @keydown.enter="handleLogin"
          />
        </UFormField>

        <UFormField v-if="authStore.has2FA" label="双重验证码">
          <UPinInput
            v-model="twoFactorInput"
            :length="6"
            otp
            :disabled="isLoading"
          />
        </UFormField>

        <UButton
          block
          :loading="isLoading"
          :disabled="!credentials.password || isLoading"
          icon="i-lucide-log-in"
          @click="handleLogin"
        >
          登录
        </UButton>
      </div>
    </UCard>
  </div>
</template>
