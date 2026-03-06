<template>
  <div class="h-full">
    <UDashboardPanel
      class="scrollbar-custom h-full"
      :ui="{ body: 'p-0 sm:p-0 overflow-y-auto overscroll-none' }"
    >
      <template #header>
        <ServerHeader />
      </template>
      <template #body>
        <UContainer class="gap-4 py-8 sm:gap-6">
          <UPageGrid v-if="configMenuItems.length > 0" class="gap-6">
            <UPageCard
              v-for="menuItem in configMenuItems"
              :key="menuItem.to"
              :title="String(menuItem.label)"
              :description="menuItem['desc']"
              :icon="menuItem.iconName"
              variant="outline"
              class="cursor-pointer"
              @click="navigateToMenuItem(menuItem.to)"
            />
          </UPageGrid>

          <div
            v-else
            class="flex flex-col items-center gap-4 py-16 text-center"
          >
            <UIcon name="i-lucide-inbox" class="text-muted size-12" />
            <p class="text-muted">暂无可用的配置选项</p>
            <UButton variant="subtle" @click="router.push('/')"
              >返回服务器列表</UButton
            >
          </div>
        </UContainer>
      </template>
    </UDashboardPanel>
  </div>
</template>

<script lang="ts" setup>
import ServerHeader from "@/components/header/server-header.vue";
import type { Menu } from "~/layouts/default.vue";

definePageMeta({
  layout: "default",
});

const router = useRouter();
const route = useRoute();
const MenuOptions = inject<Menu>(
  "menuOptions",
  computed(() => []),
);

const configMenuItems = computed(() =>
  MenuOptions.value
    .flat()
    .flatMap((item) => item.children || [])
    .filter((item) => !!item.to && item.to !== "/" && item.to !== route.path),
);

const navigateToMenuItem = (key: string | number) => {
  if (typeof key === "string") {
    router.push(key);
  }
};
</script>
