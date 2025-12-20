export default defineNuxtRouteMiddleware(async (to) => {
    const { loggedIn } = useUserSession();

    try {
        const status = await useAuthStore().checkAuthStatus();
        if (!status.hasPassword) {
            if (to.path === "/login") {
                return navigateTo("/");
            }
            return;
        }
    } catch (error) {
        console.error("Failed to fetch auth status:", error);
    }

    if (!loggedIn.value && to.path !== "/login") {
        return navigateTo("/login");
    }
});
