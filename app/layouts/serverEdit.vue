<script setup lang="ts">
import {
  ArrowBackOutline,
  BuildOutline,
  ChatbubbleOutline,
  LinkOutline,
  MenuOutline,
  SettingsOutline
} from "@vicons/ionicons5";
import type { MenuMixedOption } from "naive-ui/es/menu/src/interface";
import { computed } from "vue";
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
const renderIcon = (icon: Component) => () => h(icon);

export type MenuItem = MenuMixedOption & {
  desc: string;
};

const menuOptions = computed(() => {
  const route = useRoute();
  const serverId = route.params?.["id"];
  const menu: MenuMixedOption[] = [];
  menu.push({
    label: "返回服务器管理",
    key: "/",
    icon: renderIcon(ArrowBackOutline),
    desc: "返回服务器列表主页。"
  });
  if (serverId) {
    menu.push({
      label: "配置概览",
      key: `/servers/${serverId}`,
      icon: renderIcon(MenuOutline),
      desc: "查看所有可用的配置选项。"
    });
    menu.push({
      label: "基础设置",
      key: `/servers/${serverId}/general`,
      icon: renderIcon(SettingsOutline),
      desc: "配置服务器的基础运行参数和常规设置。"
    });
    menu.push({
      label: "账号绑定",
      key: `/servers/${serverId}/binding`,
      icon: renderIcon(LinkOutline),
      desc: "设置社交账号与游戏账号的绑定规则。"
    });
    menu.push({
      label: "消息互通",
      key: `/servers/${serverId}/message-sync`,
      icon: renderIcon(ChatbubbleOutline),
      desc: "Minecraft 与 QQ 群消息双向同步配置。"
    });
    menu.push({
      label: "高级配置",
      key: `/servers/${serverId}/advanced`,
      icon: renderIcon(BuildOutline),
      desc: "高级功能配置，包括性能优化、调试选项等。"
    });
  }
  return menu;
});

provide("menuOptions", menuOptions);

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
    <n-layout-header class="h-[var(--header-height)] p-4">
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
    <n-layout has-sider bordered position="absolute" style="top: var(--header-height)">
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
        <div class="h-full p-8 max-w-screen-xl mx-auto">
          <slot />
        </div>
      </n-layout-content>
    </n-layout>
  </n-layout>
</template>
