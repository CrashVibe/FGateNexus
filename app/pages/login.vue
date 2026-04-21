<script lang="ts" setup>
import type { AuthFormField, FormSubmitEvent } from "@nuxt/ui";

import { useAuthStore } from "#imports";
import type { LoginBody } from "#shared/model/auth";
import { LoginAPI } from "#shared/model/auth";
import { ApiErrorType, isFetchError } from "#shared/model/error";

definePageMeta({
  layout: false,
});

const toast = useToast();
const router = useRouter();
const authStore = useAuthStore();
const isLoading = ref(false);

const fields = computed(() => {
  const f: AuthFormField[] = [
    {
      disabled: isLoading.value,
      label: "密码",
      name: "password",
      placeholder: "输入密码",
      required: true,
      type: "password",
    },
  ];

  if (authStore.has2FA) {
    f.push({
      disabled: isLoading.value,
      label: "双重验证码",
      length: 6,
      name: "twoFactorToken",
      required: true,
      type: "otp",
    });
  }

  return f;
});

const failMessages = [
  "……不对。重新来。",
  "错了，再试一次。不是因为我宽容，只是规则如此。",
  "验证失败。别以为我会手软。",
];

const successMessages = [
  "验证通过。别误会，只是例行检查而已。",
  "身份确认完毕，可以进来了。",
  "……通过了。进来吧。",
  "识别成功。久等了。",
  "凭证有效。门已为你开着。",
];

const handleLogin = async (event: FormSubmitEvent<LoginBody>) => {
  try {
    isLoading.value = true;

    await authStore.login(event.data);

    const randomSuccess =
      successMessages[Math.floor(Math.random() * successMessages.length)];
    toast.add({ color: "success", title: randomSuccess });
    await router.push("/");
  } catch (error: unknown) {
    if (isFetchError(error) && error.data) {
      const { data } = error;
      if (data.code === ApiErrorType.Unauthorized) {
        const randomFail =
          failMessages[Math.floor(Math.random() * failMessages.length)];
        toast.add({ color: "error", title: randomFail });
        return;
      } else if (data.code === ApiErrorType.TooManyRequests) {
        toast.add({ color: "error", id: "rate", title: data.message });
        return;
      }
      toast.add({ color: "error", title: data.message });
      return;
    }
    console.error("Login failed:", error);
    toast.add({ color: "error", title: "发生未知错误，请联系开发者～" });
  } finally {
    isLoading.value = false;
  }
};

onMounted(async () => {
  if (!(await authStore.requireAuth())) {
    await router.push("/");
  }
});
</script>

<template>
  <div
    class="flex h-screen min-h-[calc(100vh-var(--header-height))] items-center justify-center"
  >
    <UPageCard class="w-full max-w-md">
      <UAuthForm
        :fields="fields"
        :schema="LoginAPI.POST.request"
        :submit="{
          label: '登录',
          icon: 'i-lucide-log-in',
          block: true,
          loading: isLoading,
        }"
        icon="i-lucide-lock"
        title="登录验证"
        @submit="handleLogin"
      >
        <template #description>
          <p class="text-muted-foreground text-sm">
            哼，你以为随便什么人都能进来吗……确认一下身份再说。
          </p>
        </template>
      </UAuthForm>
    </UPageCard>
  </div>
</template>
