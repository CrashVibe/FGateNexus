import { StatusCodes } from "http-status-codes";
import type { ApiResponse } from "~~/shared/types";

interface AuthStatus {
    hasPassword: boolean;
    has2FA: boolean;
    isAuthenticated: boolean;
}

export const useAuth = () => {
    const authStatus = ref<AuthStatus>({
        hasPassword: false,
        has2FA: false,
        isAuthenticated: false
    });

    const checkAuthStatus = async () => {
        try {
            const response = await $fetch<ApiResponse<AuthStatus>>("/api/auth/status");
            if (response.code === StatusCodes.OK && response.data) {
                authStatus.value = response.data;
            }
            return authStatus.value;
        } catch (error) {
            console.error("Failed to check auth status:", error);
            return authStatus.value;
        }
    };

    const logout = async () => {
        try {
            await $fetch<ApiResponse<void>>("/api/auth/logout", {
                method: "POST"
            });
            authStatus.value.isAuthenticated = false;
            await navigateTo("/login");
        } catch (error) {
            console.error("Logout failed:", error);
        }
    };

    const requireAuth = async () => {
        const status = await checkAuthStatus();
        if (status.hasPassword && !status.isAuthenticated) {
            await navigateTo("/login");
            return false;
        }
        return true;
    };

    return {
        authStatus: readonly(authStatus),
        checkAuthStatus,
        logout,
        requireAuth
    };
};
