<script lang="ts" setup>
import type { NavigationMenuItem } from "@nuxt/ui";
import {
  ArrowBackOutline,
  ChatbubbleOutline,
  LinkOutline,
  MenuOutline,
  NotificationsOutline,
  PeopleOutline,
  SettingsOutline,
  LogOutOutline
} from "@vicons/ionicons5";
import { computed, provide } from "vue";

const route = useRoute();
const dialog = useDialog();
const { savePage } = usePageStateStore();

const renderIcon = (icon: Component) => () => h(icon);

// 基础菜单
const basicMenuOptions: NavigationMenuItem[][] = [
  [
    { label: "服务器管理", to: "/", icon: renderIcon(MenuOutline) },
    { label: "Bot 实例", to: "/adapters", icon: renderIcon(LinkOutline) },
    { label: "玩家列表", to: "/players", icon: renderIcon(PeopleOutline) }
  ],
  [{ label: "系统设置", to: "/settings", icon: renderIcon(SettingsOutline) }]
];

// 服务器编辑
const serverId = computed(() => route.params?.["id"] as string | undefined);

const serverMenuOptions = computed(() => {
  const menu: NavigationMenuItem[][] = [[], []];
  menu[0]!.push({
    label: "返回",
    to: "/",
    icon: renderIcon(ArrowBackOutline),
    desc: "返回服务器列表主页。"
  });
  if (serverId.value) {
    const sid = serverId.value;
    menu[0]!.push({
      label: "配置概览",
      to: `/servers/${sid}`,
      icon: renderIcon(MenuOutline),
      desc: "查看所有可用的配置选项。"
    });
    menu[1]!.push(
      {
        label: "基础配置",
        type: "label",
        open: true,
        icon: renderIcon(SettingsOutline),
        children: [
          {
            label: "基础设置",
            to: `/servers/${sid}/general`,
            desc: "配置服务器的基础运行参数和常规设置。"
          },
          {
            label: "目标配置",
            to: `/servers/${sid}/target`,
            desc: "配置聊天平台的消息目标。"
          }
        ]
      },
      {
        label: "服务器管理",
        type: "label",
        open: true,
        icon: renderIcon(LinkOutline),
        children: [
          {
            label: "账号绑定",
            to: `/servers/${sid}/binding`,
            desc: "设置社交账号与游戏账号的绑定规则。"
          },
          {
            label: "远程指令",
            to: `/servers/${sid}/command`,
            desc: "配置服务器的远程指令。"
          }
        ]
      },
      {
        label: "聊天与消息",
        type: "label",
        open: true,
        icon: renderIcon(ChatbubbleOutline),
        children: [
          {
            label: "消息互通",
            to: `/servers/${sid}/msgbridge`,
            desc: "Minecraft 与 聊天平台消息双向同步配置。"
          }
        ]
      },
      {
        label: "事件与通知",
        type: "label",
        open: true,
        icon: renderIcon(NotificationsOutline),
        children: [
          {
            label: "事件通知",
            to: `/servers/${sid}/notify`,
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

const router = useRouter();

watch(
  () => usePageStateStore().to,
  (value) => {
    if (value) {
      dialog.warning({
        title: "有未保存的更改",
        content: "切换页面前请保存更改，或放弃未保存内容。",
        positiveText: "保存并切换",
        negativeText: "放弃更改",
        transformOrigin: "center",
        onPositiveClick: async () => {
          await savePage();
          router.push(value);
        },
        onNegativeClick: () => {
          usePageStateStore().clearPageState();
          router.push(value);
        }
      });
    }
  }
);

const open = ref(false);

const handleLogout = async () => {
  await useAuthStore().logout();
};

provide("menuOptions", menuOptions);
</script>

<template>
  <UDashboardGroup unit="rem">
    <UDashboardSidebar id="default" v-model:open="open" :min-size="12" collapsible resizable class="border-r-0 py-4">
      <template #header="{ collapsed }">
        <NuxtLink to="/" class="flex items-center justify-center gap-0.5">
          <Logo class="h-8 w-auto shrink-0" />
          <span v-if="!collapsed" class="text-highlighted text-xl font-bold">FGate</span>
        </NuxtLink>
      </template>

      <template #default="{ collapsed }">
        <transition name="page-jump-in" mode="out-in">
          <div :key="JSON.stringify(menuOptions)">
            <UNavigationMenu :collapsed="collapsed" :items="menuOptions" orientation="vertical" tooltip popover />
          </div>
        </transition>
      </template>

      <template #footer>
        <div class="flex w-full items-center justify-between">
          <ThemeToggle />
          <n-button v-if="useAuthStore().hasPassword" circle quaternary @click="handleLogout">
            <template #icon>
              <n-icon :component="LogOutOutline" />
            </template>
          </n-button>
        </div>
      </template>
    </UDashboardSidebar>

    <div
      class="ring-default bg-default/75 m-0 flex min-w-0 flex-1 overflow-hidden rounded-lg shadow ring sm:m-4 lg:ml-0"
    >
      <UDashboardPanel
        class="scrollbar-custom relative min-h-0 overflow-y-auto"
        :ui="{ body: 'p-0 sm:p-0 overscroll-none' }"
      >
        <template #body>
          <UContainer class="gap-4 py-8 sm:gap-6">
            <slot />
          </UContainer>
        </template>
      </UDashboardPanel>
    </div>
  </UDashboardGroup>
</template>
