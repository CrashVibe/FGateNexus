<script lang="ts" setup>
import {
  ArrowBackOutline,
  ChatbubbleOutline,
  CodeSlashOutline,
  CubeOutline,
  LinkOutline,
  MenuOutline,
  NotificationsOutline,
  PeopleOutline,
  SettingsOutline
} from "@vicons/ionicons5";
import type { MenuMixedOption } from "naive-ui/es/menu/src/interface";
import { computed, provide } from "vue";
import type { RouteLocationAsPathGeneric } from "vue-router";
import SidebarLayout from "~/components/layouts/SidebarLayout.vue";

export type MenuItem = MenuMixedOption & {
  label?: string;
  desc?: string;
  children?: MenuItem[];
};

const router = useRouter();
const route = useRoute();
const dialog = useDialog();
const { isPageDirty, savePage } = usePageStateStore();

const renderIcon = (icon: Component) => () => h(icon);

// 基础菜单
const basicMenuOptions: MenuItem[] = [
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

// 服务器编辑
const serverId = computed(() => route.params?.["id"] as string | undefined);

const serverMenuOptions = computed(() => {
  const menu: MenuItem[] = [];
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
          },
          {
            label: "目标配置",
            key: `/servers/${sid}/target`,
            icon: renderIcon(CubeOutline),
            desc: "配置聊天平台的消息目标。"
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

// 根据当前路由判断是否在服务器编辑页面
const isServerEditPage = computed(() => {
  return route.path.startsWith("/servers/") && route.params?.["id"];
});

// 合并菜单选项
const menuOptions = computed(() => {
  return isServerEditPage.value ? serverMenuOptions.value : basicMenuOptions;
});

export type Menu = typeof menuOptions;

const handleMenuSelect = (key: RouteLocationAsPathGeneric) => {
  const targetPath = String(key);
  if (!targetPath || targetPath === route.path) return;

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

provide("menuOptions", menuOptions);
</script>

<template>
  <SidebarLayout :menu-options="menuOptions" @menu-select="handleMenuSelect">
    <slot />
  </SidebarLayout>
</template>
