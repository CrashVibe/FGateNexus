<template>
  <div v-if="found" v-bind="$attrs">
    <div class="mb-4 flex items-center justify-between">
      <!-- info -->
      <PageHeader
        v-if="found.label"
        :title="found.label"
        :description="found.desc"
      />
      <!-- button -->
      <n-button quaternary @click="goBack">
        <template #icon>
          <n-icon>
            <ArrowBackOutline />
          </n-icon>
        </template>
        {{ isMobile ? "返回" : backButtonText }}
      </n-button>
    </div>
    <slot name="other" />
  </div>
</template>

<script lang="ts" setup>
import type { NavigationMenuChildItem, NavigationMenuItem } from "@nuxt/ui";
import { ArrowBackOutline } from "@vicons/ionicons5";
import type { ServerWithStatus } from "~~/shared/schemas/server/servers";

import { isMobile } from "#imports";
import PageHeader from "@/components/header/page-header.vue";
import { ServerData } from "~/composables/api";
import type { Menu } from "~/layouts/default.vue";

const route = useRoute();
interface Props {
  backButtonText?: string;
  backPath?: string;
}

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

const { backButtonText = "返回配置总览", backPath = "/servers/[id]" } =
  defineProps<Props>();

defineOptions({
  inheritAttrs: false,
});

const router = useRouter();

const goBack = () => {
  const targetPath = backPath.replace(
    "[id]",
    route.params["id"]?.toString() ?? "",
  );
  router.push(targetPath);
};
</script>
