<script lang="ts" setup>
import { FetchError } from "ofetch";
import { z } from "zod";

import type { ApiResponse } from "#shared/model";
import { PasswordAPI } from "#shared/model/auth";
import type { ApiErrorResponse } from "#shared/model/error";
import { validatePasswordStrength } from "#shared/utils/password";

const authStore = useAuthStore();
const { checkAuthStatus } = authStore;
const toast = useToast();
const isLoading = ref(false);

const passwordForm = reactive({
  confirmPassword: "",
  currentPassword: "",
  newPassword: "",
});

const passwordSchema = computed(() =>
  PasswordAPI.POST.request
    .extend({
      confirmPassword: z.string().min(1, "请确认密码"),
    })
    .superRefine((data, ctx) => {
      if (authStore.hasPassword && !data.currentPassword) {
        ctx.addIssue({
          code: "custom",
          message: "请输入当前密码",
          path: ["currentPassword"],
        });
      }
      if (data.newPassword !== data.confirmPassword) {
        ctx.addIssue({
          code: "custom",
          message: "两次输入的密码不一致",
          path: ["confirmPassword"],
        });
      }
    }),
);

const passwordStrength = computed(() => {
  if (!passwordForm.newPassword) {
    return null;
  }
  return validatePasswordStrength(passwordForm.newPassword);
});

const strengthColor = computed<
  "error" | "warning" | "neutral" | "info" | "success"
>(() => {
  if (!passwordStrength.value) {
    return "neutral";
  }
  const { score } = passwordStrength.value;
  if (score === 0) {
    return "error";
  }
  if (score === 1) {
    return "warning";
  }
  if (score === 2) {
    return "neutral";
  }
  if (score === 3) {
    return "info";
  }
  return "success";
});

const strengthText = computed(() => {
  if (!passwordStrength.value) {
    return "";
  }
  const labels = ["很弱", "弱", "一般", "强", "很强"];
  return labels[passwordStrength.value.score] || "";
});

const twoFAForm = reactive({
  keyuri: "",
  secret: "",
});
const twoFAState = reactive({
  token: [] as string[],
});

const twoFASchema = z.object({
  token: z
    .array(z.string().nonempty("请输入验证码"))
    .length(6, "请输入 6 位验证码"),
});

const deletePasswordForm = reactive({
  currentPassword: "",
});

const deletePasswordSchema = z.object({
  currentPassword: z.string().nonempty("请输入当前密码"),
});

const showPasswordForm = ref(false);
const showTwoFASetup = ref(false);
const showDeletePasswordModal = ref(false);

const handleSetPassword = async () => {
  if (passwordForm.newPassword !== passwordForm.confirmPassword) {
    toast.add({ color: "error", title: "两次输入的密码不一致" });
    return;
  }

  if (passwordStrength.value && !passwordStrength.value.isValid) {
    toast.add({
      color: "error",
      title: passwordStrength.value.error || "密码强度不够",
    });
    return;
  }

  try {
    isLoading.value = true;
    await $fetch<ApiResponse<void>>("/api/auth/password", {
      body: {
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
      },
      method: "POST",
    });
    toast.add({ color: "success", title: "密码设置成功，请重新登录" });
    showPasswordForm.value = false;
    Object.assign(passwordForm, {
      confirmPassword: "",
      currentPassword: "",
      newPassword: "",
    });

    await useUserSession().clear();
    await navigateTo("/login");
  } catch (error) {
    console.error("Failed to set password:", error);
    toast.add({ color: "error", title: "密码设置失败" });
  } finally {
    isLoading.value = false;
  }
};

const setup2FA = async () => {
  try {
    isLoading.value = true;
    const response = await $fetch<
      ApiResponse<{ keyuri: string; secret: string }>
    >("/api/auth/2fa/setup");
    if (response.data) {
      twoFAForm.keyuri = response.data.keyuri;
      twoFAForm.secret = response.data.secret;
      showTwoFASetup.value = true;
    }
  } catch (error) {
    console.error("Failed to setup 2FA:", error);
    toast.add({ color: "error", title: "2FA 设置失败" });
  } finally {
    isLoading.value = false;
  }
};

const verify2FA = async () => {
  try {
    isLoading.value = true;
    const tokenString = twoFAState.token.join("");
    await $fetch<ApiResponse<void>>("/api/auth/2fa/verify", {
      body: {
        secret: twoFAForm.secret,
        token: tokenString,
      },
      method: "POST",
    });
    toast.add({ color: "success", title: "2FA 验证成功" });
    showTwoFASetup.value = false;
    Object.assign(twoFAForm, { keyuri: "", secret: "" });
    twoFAState.token = [];
    await checkAuthStatus();
  } catch (error) {
    console.error("Failed to verify 2FA:", error);
    toast.add({ color: "error", title: "2FA 验证失败" });
  } finally {
    isLoading.value = false;
  }
};

const removeAuth = async (type: "password" | "2fa") => {
  if (type === "password") {
    showDeletePasswordModal.value = true;
    return;
  }

  try {
    isLoading.value = true;
    await $fetch<ApiResponse<void>>(`/api/auth/${type}`, { method: "DELETE" });
    toast.add({ color: "success", title: "2FA 已删除" });
    await checkAuthStatus();
  } catch (error) {
    console.error(`Failed to remove ${type}:`, error);
    toast.add({ color: "error", title: "删除 2FA 失败" });
  } finally {
    isLoading.value = false;
  }
};

const confirmDeletePassword = async () => {
  if (!deletePasswordForm.currentPassword) {
    toast.add({ color: "error", title: "请输入当前密码" });
    return;
  }

  try {
    isLoading.value = true;
    await $fetch<ApiResponse<void>>("/api/auth/password", {
      body: {
        currentPassword: deletePasswordForm.currentPassword,
      },
      method: "DELETE",
    });
    toast.add({ color: "success", title: "密码已删除" });
    showDeletePasswordModal.value = false;
    deletePasswordForm.currentPassword = "";

    await useUserSession().clear();
    await checkAuthStatus();
  } catch (error) {
    const errorMessage =
      error instanceof FetchError
        ? (error.data as ApiErrorResponse).message || "删除密码失败"
        : "删除密码失败";
    console.error("Failed to remove password:", error);
    toast.add({ color: "error", title: errorMessage });
  } finally {
    isLoading.value = false;
  }
};

onMounted(async () => {
  isLoading.value = true;
  try {
    await checkAuthStatus();
  } finally {
    isLoading.value = false;
  }
});
</script>

<template>
  <div>
    <div
      :class="{ 'pointer-events-none opacity-50': isLoading }"
      class="transition-opacity"
    >
      <div class="flex flex-col gap-4">
        <!-- 密码设置 -->
        <UPageCard
          icon="i-lucide-lock"
          title="密码保护"
          description="设置密码以保护你的 FGATE 实例免受未授权访问"
          variant="outline"
        >
          <template #title>
            <div class="flex items-center gap-2">
              <span class="text-lg font-semibold">密码保护</span>
              <UBadge
                v-if="useAuthStore().hasPassword"
                color="success"
                variant="subtle"
                >已设置</UBadge
              >
              <UBadge v-else color="warning" variant="subtle">未设置</UBadge>
            </div>
          </template>
          <template #description>
            <span class="text-muted text-sm"
              >设置密码以保护你的 FGATE 实例免受未授权访问</span
            >
          </template>
          <template #footer>
            <div class="flex gap-2">
              <UButton
                v-if="!useAuthStore().hasPassword"
                size="sm"
                @click="showPasswordForm = true"
              >
                设置密码
              </UButton>
              <UButton
                v-else
                size="sm"
                color="neutral"
                variant="subtle"
                @click="showPasswordForm = true"
                >修改密码</UButton
              >
              <UButton
                v-if="useAuthStore().hasPassword"
                color="error"
                variant="subtle"
                size="sm"
                @click="removeAuth('password')"
              >
                删除密码
              </UButton>
            </div>
          </template>
        </UPageCard>

        <!-- 2FA 设置 -->
        <UPageCard icon="i-lucide-shield-check" variant="outline">
          <template #title>
            <div class="flex items-center gap-2">
              <span class="text-lg font-semibold">双重验证 (2FA)</span>
              <UBadge
                v-if="useAuthStore().has2FA"
                color="success"
                variant="subtle"
                >已启用</UBadge
              >
              <UBadge v-else color="warning" variant="subtle">未启用</UBadge>
            </div>
          </template>
          <template #description>
            <span class="text-muted text-sm"
              >为你的账户添加额外的安全层，使用 TOTP 应用生成验证码</span
            >
          </template>
          <template #footer>
            <div class="flex flex-col gap-2">
              <div class="flex gap-2">
                <UButton
                  v-if="!useAuthStore().has2FA && useAuthStore().hasPassword"
                  size="sm"
                  @click="setup2FA"
                >
                  启用 2FA
                </UButton>
                <UButton
                  v-if="useAuthStore().has2FA"
                  color="error"
                  variant="subtle"
                  size="sm"
                  @click="removeAuth('2fa')"
                >
                  禁用 2FA
                </UButton>
              </div>
              <UAlert
                v-if="!useAuthStore().hasPassword"
                color="info"
                variant="subtle"
                description="需要先设置密码才能启用 2FA"
              />
            </div>
          </template>
        </UPageCard>
      </div>
    </div>

    <!-- 密码设置模态框 -->
    <UModal v-model:open="showPasswordForm" title="设置密码">
      <template #body>
        <UForm
          id="password-form"
          :schema="passwordSchema"
          :state="passwordForm"
          @submit="handleSetPassword"
        >
          <div class="flex flex-col gap-3">
            <UFormField
              v-if="useAuthStore().hasPassword"
              name="currentPassword"
              label="当前密码"
            >
              <UInput
                v-model="passwordForm.currentPassword"
                type="password"
                placeholder="输入当前密码"
                class="w-full"
              />
            </UFormField>
            <UFormField name="newPassword" label="新密码">
              <div class="flex w-full flex-col gap-2">
                <UInput
                  v-model="passwordForm.newPassword"
                  type="password"
                  placeholder="输入新密码（至少8位）"
                  class="w-full"
                />
                <template v-if="passwordForm.newPassword">
                  <div class="flex items-center gap-2">
                    <span class="text-muted text-sm">密码强度：</span>
                    <UBadge :color="strengthColor" variant="subtle" size="sm">{{
                      strengthText
                    }}</UBadge>
                  </div>
                  <UProgress
                    :model-value="
                      passwordStrength ? (passwordStrength.score / 4) * 100 : 0
                    "
                    :color="strengthColor"
                    size="xs"
                  />
                  <div
                    v-if="passwordStrength?.feedback?.suggestions?.length"
                    class="flex flex-col gap-0.5"
                  >
                    <span class="text-muted text-xs">建议：</span>
                    <span
                      v-for="(suggestion, index) in passwordStrength.feedback
                        .suggestions"
                      :key="index"
                      class="text-muted text-xs"
                      >• {{ suggestion }}</span
                    >
                  </div>
                </template>
              </div>
            </UFormField>
            <UFormField name="confirmPassword" label="确认密码">
              <UInput
                v-model="passwordForm.confirmPassword"
                type="password"
                placeholder="再次输入新密码"
                class="w-full"
              />
            </UFormField>
          </div>
        </UForm>
      </template>
      <template #footer>
        <div class="flex justify-end gap-2">
          <UButton
            type="button"
            color="neutral"
            variant="subtle"
            @click="showPasswordForm = false"
            >取消</UButton
          >
          <UButton type="submit" form="password-form">确认</UButton>
        </div>
      </template>
    </UModal>

    <!-- 2FA 设置模态框 -->
    <UModal v-model:open="showTwoFASetup" title="设置双重验证">
      <template #body>
        <UForm
          id="twofa-form"
          :schema="twoFASchema"
          :state="twoFAState"
          @submit="verify2FA"
        >
          <div class="flex flex-col gap-4">
            <p class="text-sm">
              使用你的 TOTP 应用（如 Google Authenticator、Authy
              等）扫描下方二维码：
            </p>
            <div v-if="twoFAForm.keyuri" class="flex justify-center">
              <Qrcode :height="200" :value="twoFAForm.keyuri" :width="200" />
            </div>
            <p class="text-muted text-sm">
              或手动输入密钥：{{ twoFAForm.secret }}
            </p>
            <UFormField name="token" label="验证码">
              <UPinInput
                v-model="twoFAState.token"
                :length="6"
                otp
                placeholder="○"
              />
            </UFormField>
          </div>
        </UForm>
      </template>
      <template #footer>
        <div class="flex justify-end gap-2">
          <UButton
            type="button"
            color="neutral"
            variant="subtle"
            @click="showTwoFASetup = false"
            >取消</UButton
          >
          <UButton type="submit" form="twofa-form">验证</UButton>
        </div>
      </template>
    </UModal>

    <!-- 删除密码确认模态框 -->
    <UModal v-model:open="showDeletePasswordModal" title="删除密码">
      <template #body>
        <UForm
          id="delete-password-form"
          :schema="deletePasswordSchema"
          :state="deletePasswordForm"
          @submit="confirmDeletePassword"
        >
          <div class="flex flex-col gap-4">
            <UAlert
              color="error"
              variant="subtle"
              description="此操作会清除 2FA 设置！"
              icon="i-lucide-triangle-alert"
            />
            <USeparator />
            <UFormField name="currentPassword" label="当前密码" required>
              <UInput
                v-model="deletePasswordForm.currentPassword"
                type="password"
                placeholder="输入当前密码以确认"
                class="w-full"
              />
            </UFormField>
          </div>
        </UForm>
      </template>
      <template #footer>
        <div class="flex justify-end gap-2">
          <UButton
            type="button"
            color="neutral"
            variant="subtle"
            @click="showDeletePasswordModal = false"
            >点戳了~</UButton
          >
          <UButton type="submit" form="delete-password-form" color="error"
            >确认删除</UButton
          >
        </div>
      </template>
    </UModal>
  </div>
</template>
