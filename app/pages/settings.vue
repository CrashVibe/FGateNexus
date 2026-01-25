<script lang="ts" setup>
import { validatePasswordStrength } from "#shared/utils/password";
import { ShieldCheckmarkOutline } from "@vicons/ionicons5";
import { StatusCodes } from "http-status-codes";
import { FetchError } from "ofetch";
import type { ApiErrorResponse } from "~~/shared/error";
import type { ApiResponse } from "~~/shared/types";

definePageMeta({
  layout: "default"
});

const checkAuthStatus = useAuthStore().checkAuthStatus;
const message = useMessage();
const isLoading = ref(false);

const passwordForm = reactive({
  currentPassword: "",
  newPassword: "",
  confirmPassword: ""
});

const passwordStrength = computed(() => {
  if (!passwordForm.newPassword) return null;
  return validatePasswordStrength(passwordForm.newPassword);
});

const strengthColor = computed(() => {
  if (!passwordStrength.value) return "default";
  const score = passwordStrength.value.score;
  if (score === 0) return "error";
  if (score === 1) return "warning";
  if (score === 2) return "default";
  if (score === 3) return "info";
  return "success";
});

const strengthText = computed(() => {
  if (!passwordStrength.value) return "";
  const labels = ["很弱", "弱", "一般", "强", "很强"];
  return labels[passwordStrength.value.score] || "";
});

const twoFAForm = reactive({
  keyuri: "",
  secret: "",
  token: [] as string[]
});

const deletePasswordForm = reactive({
  currentPassword: ""
});

const showPasswordForm = ref(false);
const showTwoFASetup = ref(false);
const showDeletePasswordModal = ref(false);

const handleSetPassword = async () => {
  if (passwordForm.newPassword !== passwordForm.confirmPassword) {
    message.error("两次输入的密码不一致");
    return;
  }

  if (passwordStrength.value && !passwordStrength.value.isValid) {
    message.error(passwordStrength.value.error || "密码强度不够");
    return;
  }

  try {
    isLoading.value = true;
    await $fetch<ApiResponse<void>>("/api/auth/password", {
      method: "POST",
      body: {
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword
      }
    });
    message.success("密码设置成功，请重新登录");
    showPasswordForm.value = false;
    Object.assign(passwordForm, { currentPassword: "", newPassword: "", confirmPassword: "" });

    await useUserSession().clear();
    await navigateTo("/login");
  } catch (error) {
    console.error("Failed to set password:", error);
    message.error("密码设置失败");
  } finally {
    isLoading.value = false;
  }
};

const setup2FA = async () => {
  try {
    isLoading.value = true;
    const response = await $fetch<ApiResponse<{ keyuri: string; secret: string }>>("/api/auth/2fa/setup");
    if (response.code === StatusCodes.OK && response.data) {
      twoFAForm.keyuri = response.data.keyuri;
      twoFAForm.secret = response.data.secret;
      showTwoFASetup.value = true;
    }
  } catch (error) {
    console.error("Failed to setup 2FA:", error);
    message.error("2FA 设置失败");
  } finally {
    isLoading.value = false;
  }
};

const verify2FA = async () => {
  try {
    isLoading.value = true;
    const tokenString = twoFAForm.token.join("");
    await $fetch<ApiResponse<void>>("/api/auth/2fa/verify", {
      method: "POST",
      body: {
        token: tokenString,
        secret: twoFAForm.secret
      }
    });
    message.success("2FA 验证成功");
    showTwoFASetup.value = false;
    Object.assign(twoFAForm, { keyuri: "", secret: "", token: [] });
    await checkAuthStatus();
  } catch (error) {
    console.error("Failed to verify 2FA:", error);
    message.error("2FA 验证失败");
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
    message.success("2FA 已删除");
    await checkAuthStatus();
  } catch (error) {
    console.error(`Failed to remove ${type}:`, error);
    message.error("删除 2FA 失败");
  } finally {
    isLoading.value = false;
  }
};

const confirmDeletePassword = async () => {
  if (!deletePasswordForm.currentPassword) {
    message.error("请输入当前密码");
    return;
  }

  try {
    isLoading.value = true;
    await $fetch<ApiResponse<void>>("/api/auth/password", {
      method: "DELETE",
      body: {
        currentPassword: deletePasswordForm.currentPassword
      }
    });
    message.success("密码已删除");
    showDeletePasswordModal.value = false;
    deletePasswordForm.currentPassword = "";

    await useUserSession().clear();
    await checkAuthStatus();
  } catch (error) {
    const errorMessage =
      error instanceof FetchError ? (error.data as ApiErrorResponse).message || "删除密码失败" : "删除密码失败";
    console.error("Failed to remove password:", error);
    message.error(errorMessage);
  } finally {
    isLoading.value = false;
  }
};

onMounted(async () => {
  await checkAuthStatus();
});
</script>

<template>
  <div class="mx-auto max-w-4xl">
    <n-page-header title="安全设置" subtitle="配置密码保护和双重验证">
      <template #avatar>
        <n-icon :component="ShieldCheckmarkOutline" />
      </template>
    </n-page-header>

    <n-spin :show="isLoading">
      <n-space vertical size="large" class="mt-6">
        <!-- 密码设置 -->
        <n-card title="密码保护" size="large">
          <template #header-extra>
            <n-tag v-if="useAuthStore().hasPassword" type="success">已设置</n-tag>
            <n-tag v-else type="warning">未设置</n-tag>
          </template>
          <n-space vertical>
            <n-text depth="3">设置密码以保护你的 FGATE 实例免受未授权访问</n-text>
            <n-space>
              <n-button v-if="!useAuthStore().hasPassword" type="primary" @click="showPasswordForm = true">
                设置密码
              </n-button>
              <n-button v-else @click="showPasswordForm = true">修改密码</n-button>
              <n-button v-if="useAuthStore().hasPassword" type="error" @click="removeAuth('password')">
                删除密码
              </n-button>
            </n-space>
          </n-space>
        </n-card>

        <!-- 2FA 设置 -->
        <n-card title="双重验证 (2FA)" size="large">
          <template #header-extra>
            <n-tag v-if="useAuthStore().has2FA" type="success">已启用</n-tag>
            <n-tag v-else type="warning">未启用</n-tag>
          </template>
          <n-space vertical>
            <n-text depth="3">为你的账户添加额外的安全层，使用 TOTP 应用生成验证码</n-text>
            <n-space>
              <n-button v-if="!useAuthStore().has2FA && useAuthStore().hasPassword" type="primary" @click="setup2FA">
                启用 2FA
              </n-button>
              <n-button v-if="useAuthStore().has2FA" type="error" @click="removeAuth('2fa')">禁用 2FA</n-button>
            </n-space>
            <n-alert v-if="!useAuthStore().hasPassword" type="info" style="margin-top: 12px">
              需要先设置密码才能启用 2FA
            </n-alert>
          </n-space>
        </n-card>
      </n-space>
    </n-spin>

    <!-- 密码设置模态框 -->
    <n-modal v-model:show="showPasswordForm" preset="dialog" title="设置密码">
      <n-form>
        <n-form-item v-if="useAuthStore().hasPassword" label="当前密码">
          <n-input
            v-model:value="passwordForm.currentPassword"
            type="password"
            placeholder="输入当前密码"
            show-password-on="click"
          />
        </n-form-item>
        <n-form-item label="新密码">
          <n-space vertical style="width: 100%">
            <n-input
              v-model:value="passwordForm.newPassword"
              type="password"
              placeholder="输入新密码（至少8位）"
              show-password-on="click"
            />
            <n-space v-if="passwordForm.newPassword" vertical size="small" style="width: 100%">
              <n-space align="center" :size="8">
                <n-text depth="3">密码强度：</n-text>
                <n-tag :type="strengthColor" size="small">{{ strengthText }}</n-tag>
              </n-space>
              <n-progress
                type="line"
                :percentage="passwordStrength ? (passwordStrength.score / 4) * 100 : 0"
                :status="strengthColor === 'error' ? 'error' : strengthColor === 'success' ? 'success' : 'default'"
                :show-indicator="false"
                :height="4"
              />
              <n-alert
                v-if="passwordStrength && !passwordStrength.isValid"
                type="warning"
                size="small"
                :show-icon="false"
              >
                {{ passwordStrength.error }}
              </n-alert>
              <n-space v-if="passwordStrength?.feedback?.suggestions?.length" vertical size="small">
                <n-text depth="3" style="font-size: 12px">建议：</n-text>
                <n-text
                  v-for="(suggestion, index) in passwordStrength.feedback.suggestions"
                  :key="index"
                  depth="3"
                  style="font-size: 12px"
                >
                  • {{ suggestion }}
                </n-text>
              </n-space>
            </n-space>
          </n-space>
        </n-form-item>
        <n-form-item label="确认密码">
          <n-input
            v-model:value="passwordForm.confirmPassword"
            type="password"
            placeholder="再次输入新密码"
            show-password-on="click"
          />
        </n-form-item>
      </n-form>
      <template #action>
        <n-space>
          <n-button @click="showPasswordForm = false">取消</n-button>
          <n-button type="primary" @click="handleSetPassword">确认</n-button>
        </n-space>
      </template>
    </n-modal>

    <!-- 2FA 设置模态框 -->
    <n-modal v-model:show="showTwoFASetup" preset="dialog" title="设置双重验证">
      <n-space vertical>
        <n-text>使用你的 TOTP 应用（如 Google Authenticator、Authy 等）扫描下方二维码：</n-text>
        <div v-if="twoFAForm.keyuri" class="qrcode flex justify-center">
          <n-qr-code :value="twoFAForm.keyuri" :size="200" />
        </div>
        <n-text depth="3">或手动输入密钥：{{ twoFAForm.secret }}</n-text>
        <n-form-item label="验证码">
          <n-input-otp v-model:value="twoFAForm.token" block :length="6" />
        </n-form-item>
      </n-space>
      <template #action>
        <n-space>
          <n-button @click="showTwoFASetup = false">取消</n-button>
          <n-button type="primary" @click="verify2FA">验证</n-button>
        </n-space>
      </template>
    </n-modal>

    <!-- 删除密码确认模态框 -->
    <n-modal v-model:show="showDeletePasswordModal" preset="dialog" title="删除密码">
      <n-space vertical>
        <n-alert type="warning" title="警告">
          删除密码后，你将需要重新设置密码才能登录。此操作还会清除 2FA 设置。
        </n-alert>
        <n-form>
          <n-form-item label="当前密码" required>
            <n-input
              v-model:value="deletePasswordForm.currentPassword"
              type="password"
              placeholder="输入当前密码以确认"
              show-password-on="click"
            />
          </n-form-item>
        </n-form>
      </n-space>
      <template #action>
        <n-space>
          <n-button @click="showDeletePasswordModal = false">点戳了~</n-button>
          <n-button type="error" @click="confirmDeletePassword">确认删除</n-button>
        </n-space>
      </template>
    </n-modal>
  </div>
</template>

<style lang="scss" scoped>
:deep(.n-qr-code) {
  width: auto !important;
  height: auto !important;
}
</style>
