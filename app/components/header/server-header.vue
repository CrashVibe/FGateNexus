<template>
  <PageHeader
    v-if="found?.label"
    :title="found.label"
    :description="found.desc"
  />
</template>

<script lang="ts" setup>
import type { NavigationMenuChildItem, NavigationMenuItem } from "@nuxt/ui";
import type { ServerWithStatus } from "~~/shared/schemas/server/servers";

import PageHeader from "@/components/header/page-header.vue";
import { ServerData } from "~/composables/api";
import type { Menu } from "~/layouts/default.vue";

const route = useRoute();
const serverData = ref<ServerWithStatus | null>(null);

onMounted(async () => {
  serverData.value = await ServerData.get(Number(route.params["id"]));
});

const menuOptions = inject<Menu>(
  "menuOptions",
  computed(() => []),
);

const findMenuItem = (
  menu: NavigationMenuItem[][] | NavigationMenuChildItem[],
  key: string,
): NavigationMenuItem | null => {
  for (const item of menu.flat()) {
    if (item.to === key) {
      return item;
    }
    if (item.children) {
      const child = findMenuItem(item.children, key);
      if (child) {
        return child;
      }
    }
  }
  return null;
};

const found = computed(() => {
  const foundItem = findMenuItem(menuOptions.value, route.path);
  if (!foundItem) {
    console.warn(`Menu item not found for path: ${route.path}`);
    return { desc: "", label: "" };
  }
  return foundItem;
});
</script>
