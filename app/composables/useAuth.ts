import { StatusCodes } from "http-status-codes";
import type { AuthStatus } from "~~/shared/schemas/auth";
import type { ApiResponse } from "~~/shared/types";

export const useAuth = () => {
    const { loggedIn, user, fetch: refreshSession, clear: clearSession } = useUserSession();

    const authStatus = computed<AuthStatus>(() => {
        return {
            hasPassword: true,
            has2FA: user.value?.has2FA ?? false,
            isAuthenticated: loggedIn.value
        };
    });

    const checkAuthStatus = async () => {
        try {
            const response = await $fetch<ApiResponse<AuthStatus>>("/api/auth/status");
            if (response.code === StatusCodes.OK && response.data) {
                await refreshSession();
                return response.data;
            }
            return authStatus.value;
        } catch (error) {
            console.error({ error }, "无法检查认证状态：");
            return authStatus.value;
        }
    };

    const logout = async () => {
        try {
            await $fetch("/api/auth/logout", {
                method: "POST"
            });
            await clearSession();
            await navigateTo("/login");
        } catch (error) {
            console.error({ error }, "注销失败：");
        }
    };

    const requireAuth = async () => {
        const status = authStatus.value;
        if (status.hasPassword && !status.isAuthenticated) {
            await navigateTo("/login");
            return false;
        }
        return true;
    };

    return {
        authStatus: readonly(authStatus),
        loggedIn: readonly(loggedIn),
        user: readonly(user),
        checkAuthStatus,
        logout,
        requireAuth,
        refreshSession
    };
};
