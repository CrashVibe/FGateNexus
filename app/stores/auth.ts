import { StatusCodes } from "http-status-codes";
import { defineStore } from "pinia";
import type { AuthStatus } from "~~/shared/schemas/auth";
import type { ApiResponse } from "~~/shared/types";

interface State {
  authStatus: AuthStatus;
  loading: boolean;
}

export const useAuthStore = defineStore("auth", {
  state: (): State => ({
    authStatus: {
      hasPassword: true,
      has2FA: false,
      isAuthenticated: false
    },
    loading: false
  }),

  getters: {
    isAuthenticated: (state) => state.authStatus.isAuthenticated,
    has2FA: (state) => state.authStatus.has2FA,
    hasPassword: (state) => state.authStatus.hasPassword
  },

  actions: {
    async checkAuthStatus() {
      this.loading = true;
      try {
        const { fetch: refreshSession } = useUserSession();
        const response = await $fetch<ApiResponse<AuthStatus>>("/api/auth/status");
        if (response.code === StatusCodes.OK && response.data) {
          await refreshSession();
          this.authStatus = response.data;
          return response.data;
        }
        return this.authStatus;
      } catch (error) {
        console.error({ error }, "无法检查认证状态：");
        return this.authStatus;
      } finally {
        this.loading = false;
      }
    },

    async logout() {
      try {
        const { clear: clearSession } = useUserSession();
        await $fetch("/api/auth/logout", {
          method: "POST"
        });
        await clearSession();
        this.authStatus = {
          hasPassword: true,
          has2FA: false,
          isAuthenticated: false
        };
        await navigateTo("/login");
      } catch (error) {
        console.error({ error }, "注销失败：");
      }
    },

    async requireAuth() {
      if (this.authStatus.hasPassword && !this.authStatus.isAuthenticated) {
        await navigateTo("/login");
        return false;
      }
      return true;
    }
  }
});
