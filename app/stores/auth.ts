import { defineStore } from "pinia";
import type { z } from "zod";
import { LoginAPI } from "~~/shared/schemas/auth";
import type { AuthStatus } from "~~/shared/schemas/auth";
import type { ApiResponse } from "~~/shared/types";

interface State {
  authStatus: AuthStatus;
}

export const useAuthStore = defineStore("auth", {
  actions: {
    async checkAuthStatus() {
      try {
        const { fetch: refreshSession } = useUserSession();
        const response =
          await $fetch<ApiResponse<AuthStatus>>("/api/auth/status");
        if (response.data) {
          await refreshSession();
          this.authStatus = response.data;
          return response.data;
        }
        return this.authStatus;
      } catch (error) {
        console.error({ error }, "无法检查认证状态：");
        return this.authStatus;
      }
    },

    async login(data: z.infer<typeof LoginAPI.POST.request>) {
      const { fetch: refreshSession } = useUserSession();
      await $fetch("/api/auth/login", {
        body: LoginAPI.POST.request.parse(data),
        method: "POST",
      });

      await refreshSession();
      await this.checkAuthStatus();
    },

    async logout() {
      const { clear: clearSession } = useUserSession();
      await $fetch("/api/auth/logout", {
        method: "POST",
      });

      await clearSession();
      this.authStatus = {
        has2FA: false,
        hasPassword: true,
      };
      await navigateTo("/login");
    },

    async requireAuth() {
      await this.checkAuthStatus();

      const { loggedIn } = useUserSession();

      if (this.authStatus.hasPassword && !loggedIn.value) {
        return true;
      }
      return false;
    },
  },

  getters: {
    has2FA: (state) => state.authStatus.has2FA,
    hasPassword: (state) => state.authStatus.hasPassword,
  },
  state: (): State => ({
    authStatus: {
      has2FA: false,
      hasPassword: true,
    },
  }),
});
