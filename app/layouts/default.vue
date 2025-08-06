<script setup lang="ts">
import { LinkOutline, MenuOutline, PeopleOutline, PersonCircleOutline } from "@vicons/ionicons5";
import { computed } from "vue";
import { NIcon } from "naive-ui";
import type { RouteLocationAsPathGeneric } from "vue-router";
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
const renderIcon = (icon: Component) => () => h(NIcon, null, { default: () => h(icon) });

const menuOptions = [
  { label: "服务器管理", key: "/", icon: renderIcon(MenuOutline) },
  { label: "Bot 实例", key: "/adapters", icon: renderIcon(LinkOutline) },
  { label: "玩家列表", key: "/players", icon: renderIcon(PeopleOutline) },
  { label: "社交账号", key: "/accounts", icon: renderIcon(PersonCircleOutline) }
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
  <n-layout class="w-full h-screen" bordered>
    <n-layout-header class="p-4">
      <n-space justify="space-between">
        <n-space align="center" size="large">
          <n-image src="/favicon.ico" class="align-middle size-8" preview-disabled />
          <n-text strong class="text-base align-middle">FGATE</n-text>
        </n-space>
        <n-space align="center" size="large">
          <ThemeToggle />
        </n-space>
      </n-space>
    </n-layout-header>
    <n-layout has-sider bordered class="h-full">
      <n-layout-sider
        bordered
        show-trigger
        :native-scrollbar="false"
        collapse-mode="width"
        :width="200"
        :position="isMobile ? 'absolute' : 'static'"
        :collapsed-width="isMobile ? 0 : 64"
        :collapsed="collapsed"
        @collapse="handleCollapse"
        @expand="handleExpand"
      >
        <n-menu
          :key="selectedKey"
          :options="menuOptions"
          :value="selectedKey"
          :collapsed="collapsed"
          :collapsed-width="isMobile ? 0 : 64"
          :collapsed-icon-size="isMobile ? 0 : 22"
          @update:value="handleMenuSelect"
        />
      </n-layout-sider>
      <n-layout-content :native-scrollbar="false">
        <div class="h-full p-6">
          <slot />
        </div>
      </n-layout-content>
    </n-layout>
  </n-layout>
</template>
