import type { z } from "zod";
import { create } from "zustand";

import type { LoginAPI } from "#shared/model/auth/api";
import type { AuthStatus } from "#shared/model/auth/schema";
import { AuthData } from "@/lib/api";

interface AuthState {
  authStatus: AuthStatus;
  checkAuthStatus: () => Promise<AuthStatus>;
  login: (data: z.infer<typeof LoginAPI.POST.request>) => Promise<void>;
  logout: () => Promise<void>;
  /** 是否需要跳转登录页（已设密码但未登录）。 */
  requireAuth: () => Promise<boolean>;
}

const DEFAULT_STATUS: AuthStatus = {
  has2FA: false,
  hasPassword: true,
  loggedIn: false,
};

export const useAuthStore = create<AuthState>((set, get) => ({
  authStatus: DEFAULT_STATUS,

  async checkAuthStatus() {
    try {
      const status = await AuthData.getStatus();
      if (status) {
        set({ authStatus: status });
        return status;
      }
      return get().authStatus;
    } catch {
      return get().authStatus;
    }
  },

  async login(data) {
    await AuthData.login(data);
    await get().checkAuthStatus();
  },

  async logout() {
    await AuthData.logout();
    set({
      authStatus: { has2FA: false, hasPassword: true, loggedIn: false },
    });
  },

  async requireAuth() {
    const status = await get().checkAuthStatus();
    return status.hasPassword && !status.loggedIn;
  },
}));
