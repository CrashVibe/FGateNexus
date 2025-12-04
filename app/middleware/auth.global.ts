export default defineNuxtRouteMiddleware(async (to) => {
    // 排除认证相关的页面和API
    const excludedRoutes = ["/login", "/api"];
    const isExcluded = excludedRoutes.some((route) => to.path.startsWith(route));

    if (isExcluded) {
        return;
    }

    try {
        const { data } = await $fetch<{ code: number; data: { hasPassword: boolean; isAuthenticated: boolean } }>(
            "/api/auth/status"
        );

        if (data.hasPassword && !data.isAuthenticated) {
            return navigateTo("/login");
        }
    } catch (error) {
        logger.error({ error }, "Auth check failed");
    }
});
