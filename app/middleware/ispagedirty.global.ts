export default defineNuxtRouteMiddleware(async (to, _from) => {
  const store = usePageStateStore();
  const isPageDirty = store.isPageDirty.bind(store);
  const triggerDirty = store.triggerDirty.bind(store);

  if (isPageDirty()) {
    triggerDirty(to.path);
    return abortNavigation();
  }
});
