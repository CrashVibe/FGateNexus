<script lang="ts" setup>
import PageHeader from "@/components/header/page-header.vue";
import type { Menu } from "@/layouts/default.vue";

definePageMeta({
  layout: "default",
});
const MenuOptions = inject<Menu>(
  "menuOptions",
  computed(() => []),
);

const configMenuItems = computed(() =>
  MenuOptions.value
    .flat()
    .filter((item) => item.key === "settings")
    .flatMap((item) => item.children ?? []),
);
</script>

<template>
  <div class="h-full">
    <UDashboardPanel
      class="scrollbar-custom h-full"
      :ui="{ body: 'p-0 sm:p-0 overflow-y-auto overscroll-none' }"
    >
      <template #header>
        <PageHeader title="设置" />
        <UDashboardToolbar>
          <UNavigationMenu
            :items="configMenuItems"
            highlight
            class="-mx-1 flex-1"
          />
        </UDashboardToolbar>
      </template>
      <template #body>
        <UContainer class="gap-4 py-8 sm:gap-6 lg:max-w-2xl">
          <NuxtPage />
        </UContainer>
      </template>
    </UDashboardPanel>
  </div>
</template>
