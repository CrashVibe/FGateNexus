<template>
  <div v-if="found" v-bind="$attrs">
    <div class="mb-4 flex items-center justify-between">
      <!-- info -->
      <div>
        <n-text strong>
          <h1 class="text-2xl">{{ found.label }}</h1>
          <p class="text-gray-500">{{ serverData?.name }}</p>
        </n-text>
      </div>
      <!-- button -->
      <n-button quaternary @click="goBack">
        <template #icon>
          <n-icon>
            <ArrowBackOutline />
          </n-icon>
        </template>
        {{ isMobile ? "返回" : backButtonText || "返回配置总览" }}
      </n-button>
    </div>
    <slot name="other" />
    <n-card v-if="found.desc" size="small">
      <n-text depth="3">{{ found.desc }}</n-text>
    </n-card>
  </div>
</template>

<script lang="ts" setup>
import { ArrowBackOutline } from "@vicons/ionicons5";
import type { ServerWithStatus } from "~~/shared/schemas/server/servers";
import { isMobile } from "#imports";
import { ServerData } from "~/composables/api";
import type { Menu, MenuItem } from "~/layouts/default.vue";

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
  computed(() => [])
);

function findMenuItem(menu: MenuItem[], key: string): MenuItem | null {
  for (const item of menu) {
    if (item.key === key) return item;
    if (item.children) {
      const child = findMenuItem(item.children, key);
      if (child) return child;
    }
  }
  return null;
}

const found = computed(() => {
  const found = findMenuItem(menuOptions.value, route.path);
  if (!found) {
    console.warn(`Menu item not found for path: ${route.path}`);
    return { label: "", desc: "" };
  }
  return found;
});

const props = withDefaults(defineProps<Props>(), {
  backButtonText: "返回配置总览",
  backPath: "/servers/[id]"
});

defineOptions({
  inheritAttrs: false
});

const router = useRouter();

const goBack = () => {
  const targetPath = props.backPath.replace("[id]", route.params["id"]?.toString() ?? "");
  router.push(targetPath);
};
</script>
