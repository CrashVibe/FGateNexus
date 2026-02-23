<template>
  <div>
    <HeaderServer back-button-text="服务器列表" back-path="/" class="mb-3" />

    <n-grid v-if="configMenuItems.length > 0" :cols="isMobile ? 1 : '3'" :item-responsive="true" x-gap="12" y-gap="12">
      <n-gi v-for="menuItem in configMenuItems" :key="menuItem.key" :span="getCardSpan(String(menuItem.label))">
        <n-card
          :title="String(menuItem.label)"
          class="config-card"
          embedded
          hoverable
          @click="navigateToMenuItem(menuItem.key!)"
        >
          <template v-if="menuItem.icon" #header-extra>
            <n-icon :component="menuItem.icon" size="20" />
          </template>
          <n-text depth="3">{{ menuItem["desc"] }}</n-text>
        </n-card>
      </n-gi>
    </n-grid>

    <n-empty v-else description="暂无可用的配置选项">
      <template #extra>
        <n-button size="medium" type="primary" @click="router.push('/')">返回服务器列表</n-button>
      </template>
    </n-empty>
  </div>
</template>

<script lang="ts" setup>
import { isMobile } from "#imports";
import type { Menu } from "~/layouts/default.vue";

definePageMeta({
  layout: "default"
});

const router = useRouter();
const route = useRoute();
const MenuOptions = inject<Menu>(
  "menuOptions",
  computed(() => [])
);

const configMenuItems = computed(() => {
  return MenuOptions.value
    .flatMap((item) => item.children || [])
    .filter((item) => {
      return !!item.key && item.key !== "/" && item.key !== route.path;
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
</script>

<style scoped>
.config-card {
  height: 100%;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    transform: translateY(-2px);
  }

  &:active {
    transform: translateY(0);
  }
}
</style>
