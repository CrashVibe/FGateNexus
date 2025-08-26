<script lang="ts" setup>
import {
  ArrowBackOutline,
  ChatbubbleOutline,
  CodeSlashOutline,
  LinkOutline,
  MenuOutline,
  NotificationsOutline,
  SettingsOutline
} from "@vicons/ionicons5";
import type { MenuMixedOption } from "naive-ui/es/menu/src/interface";
import { computed } from "vue";
import { isMobile } from "#imports";

const router = useRouter();
const route = useRoute();
const SIDEBAR_STORAGE_KEY = "sidebar-collapsed";
const collapsed = ref(isMobile.value);
const dialog = useDialog();
const { setPageState, clearPageState, isPageDirty, savePage } = usePageStateProvider();

// 页面状态注册函数给子组件
provide("registerPageState", setPageState);
provide("clearPageState", clearPageState);

const handleMenuSelect = (key: string) => {
  const targetPath = String(key);
  if (!targetPath || targetPath === "undefined" || targetPath === route.path) return;

  if (isPageDirty()) {
    dialog.warning({
      title: "有未保存的更改",
      content: "切换页面前请保存更改，或放弃未保存内容。",
      positiveText: "保存并切换",
      negativeText: "放弃更改",
      transformOrigin: "center",
      onPositiveClick: async () => {
        await savePage();
        router.push(targetPath).catch(() => {});
      },
      onNegativeClick: () => {
        router.push(targetPath).catch(() => {});
      }
    });
    return;
  }
  router.push(targetPath).catch(() => {});
};

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
  label: string;
  desc: string;
  children: MenuItem[];
};

const menuOptions = computed(() => {
  const route = useRoute();
  const serverId = route.params?.["id"];
  const menu: MenuMixedOption[] = [];
  menu.push({
    label: "返回",
    key: "/",
    icon: renderIcon(ArrowBackOutline),
    desc: "返回服务器列表主页。"
  });
  if (serverId) {
    menu.push(
      {
        label: "配置概览",
        key: `/servers/${serverId}`,
        icon: renderIcon(MenuOutline),
        desc: "查看所有可用的配置选项。"
      },
      {
        type: "divider"
      },
      {
        type: "group",
        label: "基础配置",
        children: [
          {
            label: "基础设置",
            key: `/servers/${serverId}/general`,
            icon: renderIcon(SettingsOutline),
            desc: "配置服务器的基础运行参数和常规设置。"
          }
        ]
      },
      {
        type: "group",
        label: "服务器管理",
        key: `server_manager`,
        children: [
          {
            label: "账号绑定",
            key: `/servers/${serverId}/binding`,
            icon: renderIcon(LinkOutline),
            desc: "设置社交账号与游戏账号的绑定规则。"
          },
          {
            label: "远程指令",
            key: `/servers/${serverId}/command`,
            icon: renderIcon(CodeSlashOutline),
            desc: "配置服务器的远程指令。"
          }
        ]
      },
      {
        type: "group",
        label: "聊天与消息",
        key: `server_bot`,
        children: [
          {
            label: "消息互通",
            key: `/servers/${serverId}/msgbridge`,
            icon: renderIcon(ChatbubbleOutline),
            desc: "Minecraft 与 聊天平台消息双向同步配置。"
          }
        ]
      },
      {
        type: "group",
        label: "事件与通知",
        key: `server_event`,
        children: [
          {
            label: "事件通知",
            key: `/servers/${serverId}/notify`,
            icon: renderIcon(NotificationsOutline),
            desc: "配置服务器的事件通知。"
          }
        ]
      }
    );
  }
  return menu;
});

provide("menuOptions", menuOptions);

const selectedKey = computed(() => route.path);
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
        :show-trigger="true"
        :width="200"
        bordered
        collapse-mode="width"
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
        <div class="h-full max-w-screen-xl p-8 pt-12 pb-24 mx-auto">
          <slot />
        </div>
      </n-layout-content>
    </n-layout>
  </n-layout>
</template>
