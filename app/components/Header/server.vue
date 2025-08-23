<template>
  <div v-bind="$attrs">
    <div class="flex items-center justify-between mb-4">
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
import type { MenuItem } from "~/layouts/serverEdit.vue";
import type { ServerWithStatus } from "~~/shared/schemas/server/servers";

const route = useRoute();
interface Props {
  backButtonText?: string;
  backPath?: string;
}

const serverData = ref<ServerWithStatus | null>(null);

onMounted(async () => {
  serverData.value = await getServerData();
});

const menuOptions: Ref<MenuItem[]> = inject(
  "menuOptions",
  computed(() => [])
);
const found = computed(() => {
  const found = menuOptions.value.find((item) => item.key === route.path);
  if (!found) throw new Error(`Menu item not found for path: ${route.path}`);
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
  if (props.backPath.includes("[id]")) {
    const currentRoute = router.currentRoute.value;
    const serverId = currentRoute.params["id"] || "";
    const targetPath = props.backPath.replace("[id]", serverId as string);
    router.push(targetPath);
  } else {
    router.push(props.backPath);
  }
};
</script>
