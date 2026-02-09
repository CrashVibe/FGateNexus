export default defineNuxtRouteMiddleware(async (to) => {
  await useAuthStore().checkAuthStatus();
  if ((await useAuthStore().requireAuth()) && to.path !== "/login") {
    return navigateTo("/login");
  }
});
