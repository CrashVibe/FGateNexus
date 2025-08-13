<template>
  <div>
    <HeaderServer
      :title="String(found.label) || '未知'"
      :server-name="serverData?.name || ''"
      back-button-text="服务器列表"
      back-path="/"
      :desc="found.desc"
      class="mb-6"
    />

    <n-grid
      v-if="configMenuItems.length > 0"
      :cols="isMobile ? 1 : '600:2 1100:3 1600:4'"
      x-gap="20"
      y-gap="20"
      :item-responsive="true"
    >
      <n-gi v-for="menuItem in configMenuItems" :key="menuItem.key" :span="getCardSpan(String(menuItem.label))">
        <n-card
          :title="String(menuItem.label)"
          hoverable
          embedded
          class="config-card"
          @click="navigateToMenuItem(menuItem.key!)"
        >
          <template #header-extra v-if="menuItem.icon">
            <n-icon :component="menuItem.icon" size="20" />
          </template>
          <n-text depth="3">{{ menuItem["desc"] }}</n-text>
        </n-card>
      </n-gi>
    </n-grid>

    <n-empty v-else description="暂无可用的配置选项">
      <template #extra>
        <n-button type="primary" size="medium" @click="$router.push('/')"> 返回服务器列表 </n-button>
      </template>
    </n-empty>
  </div>
</template>

<script setup lang="ts">
import type { MenuItem } from "~/layouts/serverEdit.vue";

definePageMeta({
  layout: "server-edit"
});

const router = useRouter();
const route = useRoute();
const menuOptions: Ref<MenuItem[]> = inject(
  "menuOptions",
  computed(() => [])
);

const found = computed(() => {
  const found = menuOptions.value.find((item) => item.key === route.path);
  if (!found) throw new Error(`Menu item not found for path: ${route.path}`);
  return found;
});

const configMenuItems = computed(() => {
  const serverId = route.params?.["id"];
  if (!serverId) return [];
  return menuOptions.value.filter((item) => {
    const key = item.key;
    if (!key) return false;
    return key !== "/" && key !== route.path;
  });
});

const getCardSpan = (title: string) => {
  return title.length > 4 ? 2 : 1;
};

const navigateToMenuItem = (key: string | number) => {
  if (typeof key === "string") {
    router.push(key);
  }
};

const { serverData: serverData } = getServerData.value;
</script>

<style scoped>
.config-card {
  height: 100%;
  cursor: pointer;
  transition: all 0.2s var(--n-bezier);

  &:hover {
    transform: translateY(-2px);
  }

  &:active {
    transform: translateY(0);
  }
}
</style>
