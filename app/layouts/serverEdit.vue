<script lang="ts" setup>
import { isMobile } from "#imports";
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

const router = useRouter();
const route = useRoute();
const SIDEBAR_STORAGE_KEY = "sidebar-collapsed";
const MOBILE_WIDTH = 768;

const collapsed = ref(isMobile.value);
const dialog = useDialog();
const { setPageState, clearPageState, isPageDirty, savePage } = usePageStateProvider();

// 页面状态注册函数给子组件
provide("registerPageState", setPageState);
provide("clearPageState", clearPageState);

// 本地存储避免重复字符串与分支
const readStoredCollapsed = (): boolean | null => {
  if (isMobile.value) return null;
  const v = localStorage.getItem(SIDEBAR_STORAGE_KEY);
  return v === null ? null : v === "true";
};
const writeStoredCollapsed = (v: boolean) => {
  if (!isMobile.value) localStorage.setItem(SIDEBAR_STORAGE_KEY, v ? "true" : "false");
};

// 持久化
const setCollapsed = (v: boolean, persist = true) => {
  if (collapsed.value === v) return;
  collapsed.value = v;
  if (persist) writeStoredCollapsed(v);
};

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

const handleResize = () => {
  // 窗口大小变化
  if (window.innerWidth <= MOBILE_WIDTH) {
    // 移动端强制折叠（不持久化）
    setCollapsed(true, false);
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
    collapsed.value = true; // 移动端强制折叠
  }
  window.addEventListener("resize", handleResize);
});

onUnmounted(() => {
  window.removeEventListener("resize", handleResize);
});

// 侧边栏折叠/展开处理
const handleCollapse = () => {
  setCollapsed(true); // 默认持久化桌面端
};

const handleExpand = () => {
  setCollapsed(false); // 默认持久化桌面端
};

// 菜单配置
const renderIcon = (icon: Component) => () => h(icon);

export type MenuItem = MenuMixedOption & {
  label: string;
  desc: string;
  children: MenuItem[];
};

const serverId = computed(() => route.params?.["id"] as string | undefined);

const menuOptions = computed(() => {
  const menu: MenuMixedOption[] = [];
  menu.push({
    label: "返回",
    key: "/",
    icon: renderIcon(ArrowBackOutline),
    desc: "返回服务器列表主页。"
  });
  if (serverId.value) {
    const sid = serverId.value;
    menu.push(
      {
        label: "配置概览",
        key: `/servers/${sid}`,
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
            key: `/servers/${sid}/general`,
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
            key: `/servers/${sid}/binding`,
            icon: renderIcon(LinkOutline),
            desc: "设置社交账号与游戏账号的绑定规则。"
          },
          {
            label: "远程指令",
            key: `/servers/${sid}/command`,
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
            key: `/servers/${sid}/msgbridge`,
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
            key: `/servers/${sid}/notify`,
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
        :collapsed-width="0"
        :native-scrollbar="false"
        :position="isMobile ? 'absolute' : 'static'"
        :show-trigger="true"
        :width="200"
        inverted
        bordered
        @collapse="handleCollapse"
        @expand="handleExpand"
      >
        <n-menu
          :value="selectedKey"
          :collapsed="collapsed"
          :options="menuOptions"
          inverted
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
