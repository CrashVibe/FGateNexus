<script lang="ts" setup>
import { LinkOutline, MenuOutline, PeopleOutline } from "@vicons/ionicons5";
import { computed } from "vue";
import type { RouteLocationAsPathGeneric } from "vue-router";
import { isMobile } from "#imports";

const router = useRouter();
const route = useRoute();

const SIDEBAR_STORAGE_KEY = "sidebar-collapsed";
const collapsed = ref(isMobile.value);

onMounted(() => {
  if (!isMobile.value) {
    const stored = localStorage.getItem(SIDEBAR_STORAGE_KEY);
    if (stored !== null) {
      collapsed.value = stored === "true";
    }
  }

  // 窗口大小变化
  const handleResize = () => {
    if (window.innerWidth <= 768) {
      collapsed.value = true; // 移动端强制折叠
    } else {
      const stored = localStorage.getItem(SIDEBAR_STORAGE_KEY);
      collapsed.value = stored === "true";
    }
  };

  window.addEventListener("resize", handleResize);
  onUnmounted(() => window.removeEventListener("resize", handleResize));
});

// 侧边栏折叠/展开处理
const handleCollapse = () => {
  collapsed.value = true;
  if (!isMobile.value) {
    localStorage.setItem(SIDEBAR_STORAGE_KEY, "true");
  }
};

const handleExpand = () => {
  collapsed.value = false;
  if (!isMobile.value) {
    localStorage.setItem(SIDEBAR_STORAGE_KEY, "false");
  }
};

// 菜单配置
const renderIcon = (icon: Component) => () => h(icon);

const menuOptions = [
  { label: "服务器管理", key: "/", icon: renderIcon(MenuOutline) },
  { label: "Bot 实例", key: "/adapters", icon: renderIcon(LinkOutline) },
  { label: "玩家列表", key: "/players", icon: renderIcon(PeopleOutline) }
];

const selectedKey = computed(() => route.path);

const handleMenuSelect = (key: RouteLocationAsPathGeneric) => {
  const targetPath = String(key);
  if (targetPath !== route.path) {
    router.push(targetPath).catch(console.error);
  }
};
</script>

<template>
  <n-layout bordered position="absolute">
    <n-layout-header bordered class="h-[var(--header-height)] p-4">
      <n-space justify="space-between">
        <n-space align="center" size="large">
          <n-image class="align-middle size-8" preview-disabled src="/favicon.ico" />
          <n-text class="text-base align-middle" strong>FGATE</n-text>
        </n-space>
        <n-space align="center" size="large">
          <ThemeToggle />
        </n-space>
      </n-space>
    </n-layout-header>
    <n-layout bordered has-sider position="absolute" style="top: var(--header-height)">
      <n-layout-sider
        :collapsed="collapsed"
        :collapsed-width="isMobile ? 0 : 64"
        :native-scrollbar="false"
        :position="isMobile ? 'absolute' : 'static'"
        :width="200"
        bordered
        collapse-mode="width"
        show-trigger
        @collapse="handleCollapse"
        @expand="handleExpand"
      >
        <n-menu
          :key="selectedKey"
          :collapsed="collapsed"
          :collapsed-icon-size="isMobile ? 0 : 22"
          :collapsed-width="isMobile ? 0 : 64"
          :options="menuOptions"
          :value="selectedKey"
          @update:value="handleMenuSelect"
        />
      </n-layout-sider>
      <n-layout-content :native-scrollbar="false">
        <div class="h-full p-8 pt-12 pb-24 mx-auto">
          <slot />
        </div>
      </n-layout-content>
    </n-layout>
  </n-layout>
</template>
