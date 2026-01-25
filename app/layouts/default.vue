<script lang="ts" setup>
import { isMobile } from "#imports";
import { LinkOutline, MenuOutline, PeopleOutline, SettingsOutline } from "@vicons/ionicons5";
import type { MenuMixedOption } from "naive-ui/es/menu/src/interface";
import { computed } from "vue";
import type { RouteLocationAsPathGeneric } from "vue-router";

const router = useRouter();
const route = useRoute();

const SIDEBAR_STORAGE_KEY = "sidebar-collapsed";
const MOBILE_WIDTH = 768;

const collapsed = ref(isMobile.value);

const readStoredCollapsed = (): boolean | null => {
  if (isMobile.value) return null;
  const v = localStorage.getItem(SIDEBAR_STORAGE_KEY);
  return v === null ? null : v === "true";
};
const writeStoredCollapsed = (v: boolean) => {
  if (!isMobile.value) localStorage.setItem(SIDEBAR_STORAGE_KEY, v ? "true" : "false");
};
const setCollapsed = (v: boolean, persist = true) => {
  if (collapsed.value === v) return;
  collapsed.value = v;
  if (persist) writeStoredCollapsed(v);
};

const handleResize = () => {
  // 窗口大小变化
  if (window.innerWidth <= MOBILE_WIDTH) {
    setCollapsed(true, false); // 移动端强制折叠
  } else {
    const stored = readStoredCollapsed();
    setCollapsed(stored ?? false, false);
  }
};

onMounted(() => {
  if (!isMobile.value) {
    const stored = readStoredCollapsed();
    if (stored !== null) collapsed.value = stored;
  } else {
    collapsed.value = true;
  }
  window.addEventListener("resize", handleResize);
});

onUnmounted(() => {
  window.removeEventListener("resize", handleResize);
});

// 侧边栏折叠/展开处理
const handleCollapse = () => setCollapsed(true);
const handleExpand = () => setCollapsed(false);

// 菜单配置
const renderIcon = (icon: Component) => () => h(icon);

const menuOptions: MenuMixedOption[] = [
  {
    type: "group",
    label: "核心功能",
    children: [
      { label: "服务器管理", key: "/", icon: renderIcon(MenuOutline) },
      { label: "Bot 实例", key: "/adapters", icon: renderIcon(LinkOutline) },
      { label: "玩家列表", key: "/players", icon: renderIcon(PeopleOutline) }
    ]
  },
  {
    type: "divider"
  },
  {
    type: "group",
    label: "系统设置",
    children: [{ label: "系统设置", key: "/settings", icon: renderIcon(SettingsOutline) }]
  }
];

const selectedKey = computed(() => route.path);

const handleMenuSelect = (key: RouteLocationAsPathGeneric) => {
  const targetPath = String(key);
  if (targetPath && targetPath !== route.path) {
    router.push(targetPath).catch(() => {});
  }
};
</script>

<template>
  <n-layout bordered position="absolute">
    <AppHeader />
    <n-layout bordered has-sider position="absolute" style="top: var(--header-height)">
      <n-layout-sider
        :collapsed="collapsed"
        :collapsed-width="0"
        :native-scrollbar="false"
        :position="isMobile ? 'absolute' : 'static'"
        :show-trigger="true"
        :width="200"
        bordered
        @collapse="handleCollapse"
        @expand="handleExpand"
      >
        <n-menu :value="selectedKey" :collapsed="collapsed" :options="menuOptions" @update:value="handleMenuSelect" />
      </n-layout-sider>
      <n-layout-content :native-scrollbar="false">
        <div class="mx-auto h-full p-8 pt-12 pb-24">
          <slot />
        </div>
      </n-layout-content>
    </n-layout>
  </n-layout>
</template>

<style lang="scss" scoped>
@use "./css/main.scss";
</style>
