<script lang="ts" setup>
import { ShieldCheckmarkOutline } from "@vicons/ionicons5";
import { StatusCodes } from "http-status-codes";
import type { ApiResponse } from "~~/shared/types";

definePageMeta({
  layout: "default"
});

const message = useMessage();
const isLoading = ref(false);

// 认证状态
const authStatus = ref({
  hasPassword: false,
  has2FA: false,
  isAuthenticated: false
});

// 表单数据
const passwordForm = reactive({
  currentPassword: "",
  newPassword: "",
  confirmPassword: ""
});

const twoFAForm = reactive({
  keyuri: "",
  secret: "",
  token: [] as string[]
});

// 页面状态
const showPasswordForm = ref(false);
const showTwoFASetup = ref(false);

// 检查认证状态
const checkAuthStatus = async () => {
  try {
    isLoading.value = true;
    const response = await $fetch<ApiResponse<typeof authStatus.value>>("/api/auth/status");
    if (response.code === StatusCodes.OK && response.data) {
      authStatus.value = response.data;
    }
  } catch (error) {
    console.error("Failed to check auth status:", error);
    message.error("获取认证状态失败");
  } finally {
    isLoading.value = false;
  }
};

// 设置密码
const handleSetPassword = async () => {
  if (passwordForm.newPassword !== passwordForm.confirmPassword) {
    message.error("两次输入的密码不一致");
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
    message.success("密码设置成功");
    showPasswordForm.value = false;
    Object.assign(passwordForm, { currentPassword: "", newPassword: "", confirmPassword: "" });
    await checkAuthStatus();
  } catch (error) {
    console.error("Failed to set password:", error);
    message.error("密码设置失败");
  } finally {
    isLoading.value = false;
  }
};

// 设置2FA
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
    message.error("2FA设置失败");
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
    message.success("2FA验证成功");
    showTwoFASetup.value = false;
    Object.assign(twoFAForm, { keyuri: "", secret: "", token: [] });
    await checkAuthStatus();
  } catch (error) {
    console.error("Failed to verify 2FA:", error);
    message.error("2FA验证失败");
  } finally {
    isLoading.value = false;
  }
};

// 删除认证方式
const removeAuth = async (type: "password" | "2fa") => {
  try {
    isLoading.value = true;
    await $fetch<ApiResponse<void>>(`/api/auth/${type}`, { method: "DELETE" });
    message.success(`${type === "password" ? "密码" : "2FA"}已删除`);
    await checkAuthStatus();
  } catch (error) {
    console.error(`Failed to remove ${type}:`, error);
    message.error(`删除${type === "password" ? "密码" : "2FA"}失败`);
  } finally {
    isLoading.value = false;
  }
};

onMounted(() => {
  checkAuthStatus();
});
</script>

<template>
  <div class="max-w-4xl mx-auto">
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
            <n-tag v-if="authStatus.hasPassword" type="success">已设置</n-tag>
            <n-tag v-else type="warning">未设置</n-tag>
          </template>
          <n-space vertical>
            <n-text depth="3">设置密码以保护你的FGATE实例免受未授权访问</n-text>
            <n-space>
              <n-button v-if="!authStatus.hasPassword" type="primary" @click="showPasswordForm = true">
                设置密码
              </n-button>
              <n-button v-else @click="showPasswordForm = true">修改密码</n-button>
              <n-button v-if="authStatus.hasPassword" type="error" @click="removeAuth('password')">删除密码</n-button>
            </n-space>
          </n-space>
        </n-card>

        <!-- 2FA设置 -->
        <n-card title="双重验证 (2FA)" size="large">
          <template #header-extra>
            <n-tag v-if="authStatus.has2FA" type="success">已启用</n-tag>
            <n-tag v-else type="warning">未启用</n-tag>
          </template>
          <n-space vertical>
            <n-text depth="3">为你的账户添加额外的安全层，使用TOTP应用生成验证码</n-text>
            <n-space>
              <n-button v-if="!authStatus.has2FA && authStatus.hasPassword" type="primary" @click="setup2FA">
                启用2FA
              </n-button>
              <n-button v-if="authStatus.has2FA" type="error" @click="removeAuth('2fa')">禁用2FA</n-button>
            </n-space>
            <n-alert v-if="!authStatus.hasPassword" type="info" style="margin-top: 12px">
              需要先设置密码才能启用2FA
            </n-alert>
          </n-space>
        </n-card>
      </n-space>
    </n-spin>

    <!-- 密码设置模态框 -->
    <n-modal v-model:show="showPasswordForm" preset="dialog" title="设置密码">
      <n-form>
        <n-form-item v-if="authStatus.hasPassword" label="当前密码">
          <n-input
            v-model:value="passwordForm.currentPassword"
            type="password"
            placeholder="输入当前密码"
            show-password-on="click"
          />
        </n-form-item>
        <n-form-item label="新密码">
          <n-input
            v-model:value="passwordForm.newPassword"
            type="password"
            placeholder="输入新密码"
            show-password-on="click"
          />
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

    <!-- 2FA设置模态框 -->
    <n-modal v-model:show="showTwoFASetup" preset="dialog" title="设置双重验证">
      <n-space vertical>
        <n-text>使用你的TOTP应用（如Google Authenticator、Authy等）扫描下方二维码：</n-text>
        <div v-if="twoFAForm.keyuri" class="flex justify-center qrcode">
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
  </div>
</template>

<style lang="less" scoped>
:deep(.n-qr-code) {
  width: auto !important;
  height: auto !important;
}
</style>
