<template>
  <div v-bind="$attrs">
    <div class="flex items-center justify-between mb-4">
      <!-- info -->
      <div>
        <n-text strong>
          <h1 class="text-2xl">{{ title }}</h1>
          <p class="text-gray-500">{{ serverName }}</p>
        </n-text>
      </div>
      <!-- button -->
      <n-button quaternary @click="goBack">
        <template #icon>
          <n-icon :component="ArrowBackOutline" />
        </template>
        {{ isMobile ? "返回" : backButtonText || "返回配置总览" }}
      </n-button>
    </div>
    <slot name="other" />
    <n-card v-if="desc" size="small">
      <n-text depth="3">{{ desc }}</n-text>
    </n-card>
  </div>
</template>

<script lang="ts" setup>
import { ArrowBackOutline } from "@vicons/ionicons5";

interface Props {
  title: string;
  serverName: string;
  desc: string;
  backButtonText?: string;
  backPath?: string;
}

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
