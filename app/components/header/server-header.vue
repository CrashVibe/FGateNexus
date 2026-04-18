<template>
  <PageHeader
    v-if="found?.label"
    :title="found.label"
    :description="found.desc"
  />
</template>

<script lang="ts" setup>
import type { NavigationMenuChildItem, NavigationMenuItem } from "@nuxt/ui";

import PageHeader from "@/components/header/page-header.vue";
import type { Menu } from "~/layouts/default.vue";

const route = useRoute();

const menuOptions = inject<Menu>(
  "menuOptions",
  computed(() => []),
);

const findMenuItem = (
  items: (NavigationMenuItem | NavigationMenuChildItem)[],
  key: string,
): NavigationMenuItem | NavigationMenuChildItem | null => {
  for (const item of items) {
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

const found = computed(() =>
  findMenuItem(menuOptions.value.flat(), route.path),
);
</script>
