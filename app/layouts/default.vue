<script lang="ts" setup>
import type { NavigationMenuItem } from "@nuxt/ui";
import { computed, provide } from "vue";

import AppLogo from "@/components/app-logo.vue";

const route = useRoute();
const { savePage } = usePageStateStore();

// 基础菜单
const basicMenuOptions: NavigationMenuItem[][] = [
  [
    { icon: "i-lucide-server", label: "服务器管理", to: "/" },
    { icon: "i-lucide-link", label: "Bot 实例", to: "/adapters" },
    { icon: "i-lucide-users", label: "玩家列表", to: "/players" },
  ],
  [
    {
      children: [
        {
          desc: "配置系统的安全相关选项，如管理员账号和权限设置。",
          icon: "i-lucide-shield",
          label: "安全设置",
          to: "/settings/security",
        },
        {
          desc: "下载或配置 Chromium 浏览器，用于图片渲染功能。",
          icon: "i-lucide-chrome",
          label: "浏览器设置",
          to: "/settings/browser",
        },
      ],
      icon: "i-lucide-settings",
      key: "settings",
      label: "系统设置",
      open: true,
    },
  ],
];

// 服务器编辑
const serverId = computed(() => route.params?.["id"] as string | undefined);

const serverMenuOptions = computed(() => {
  const menu: NavigationMenuItem[][] = [[], []];
  menu[0]?.push({
    desc: "返回服务器列表主页。",
    icon: "i-lucide-arrow-left",
    label: "返回",
    to: "/",
  });
  if (serverId.value) {
    const sid = serverId.value;
    menu[0]?.push({
      desc: "查看所有可用的配置选项",
      icon: "i-lucide-layout-grid",
      label: "配置概览",
      to: `/servers/${sid}`,
    });
    menu[1]?.push(
      {
        children: [
          {
            desc: "配置服务器的基础运行参数和常规设置",
            label: "基础设置",
            to: `/servers/${sid}/general`,
          },
          {
            desc: "配置聊天平台的消息目标",
            label: "目标配置",
            to: `/servers/${sid}/target`,
          },
        ],
        icon: "i-lucide-settings",
        label: "基础配置",
        open: true,
      },
      {
        children: [
          {
            desc: "设置社交账号与游戏账号的绑定规则",
            label: "账号绑定",
            to: `/servers/${sid}/binding`,
          },
          {
            desc: "配置服务器的远程指令",
            label: "远程指令",
            to: `/servers/${sid}/command`,
          },
        ],
        icon: "i-lucide-link",
        label: "服务器管理",
        open: true,
      },
      {
        children: [
          {
            desc: "Minecraft 与 聊天平台消息双向同步配置",
            label: "消息互通",
            to: `/servers/${sid}/msgbridge`,
          },
        ],
        icon: "i-lucide-message-circle",
        label: "聊天与消息",
        open: true,
      },
      {
        children: [
          {
            desc: "配置服务器的事件通知",
            label: "事件通知",
            to: `/servers/${sid}/notify`,
          },
        ],
        icon: "i-lucide-bell",
        label: "事件与通知",
        open: true,
      },
    );
  }
  return menu;
});

// 根据当前路由判断是否在服务器编辑页面
const isServerEditPage = computed(
  () => route.path.startsWith("/servers/") && route.params?.["id"],
);

// 合并菜单选项
const menuOptions = computed(() =>
  isServerEditPage.value ? serverMenuOptions.value : basicMenuOptions,
);

export type Menu = typeof menuOptions;

const router = useRouter();

const showDirtyModal = ref(false);
const dirtyNavTarget = ref("");

watch(
  () => usePageStateStore().to,
  (value) => {
    if (value) {
      dirtyNavTarget.value = value;
      showDirtyModal.value = true;
    }
  },
);

const onDiscardChanges = () => {
  usePageStateStore().clearPageState();
  router.push(dirtyNavTarget.value);
  showDirtyModal.value = false;
};

const onSaveAndNavigate = async () => {
  await savePage();
  await router.push(dirtyNavTarget.value);
  showDirtyModal.value = false;
};

const open = ref(false);

const handleLogout = async () => {
  await useAuthStore().logout();
};

provide("menuOptions", menuOptions);
</script>

<template>
  <UDashboardGroup unit="rem">
    <UDashboardSidebar
      id="default"
      v-model:open="open"
      :min-size="12"
      collapsible
      resizable
      class="bg-elevated/25"
      :ui="{ footer: 'lg:border-t lg:border-default' }"
    >
      <template #header="{ collapsed }">
        <NuxtLink to="/" class="flex items-center justify-center gap-0.5">
          <AppLogo class="h-9 w-auto shrink-0" />
          <span v-if="!collapsed" class="text-highlighted text-2xl font-bold"
            >FGate</span
          >
        </NuxtLink>
      </template>

      <template #default="{ collapsed }">
        <transition name="page-jump-in" mode="out-in">
          <div :key="JSON.stringify(menuOptions)">
            <UNavigationMenu
              :collapsed="collapsed"
              :items="menuOptions"
              orientation="vertical"
              tooltip
              popover
            />
          </div>
        </transition>
      </template>

      <template #footer="{ collapsed }">
        <div
          :class="[
            'flex w-full items-center',
            collapsed ? 'flex-col gap-2' : 'justify-between',
          ]"
        >
          <UColorModeButton />
          <UButton
            v-if="useAuthStore().hasPassword"
            icon="i-lucide-log-out"
            color="neutral"
            variant="ghost"
            size="sm"
            aria-label="退出登录"
            @click="handleLogout"
          />
        </div>
      </template>
    </UDashboardSidebar>

    <div
      class="ring-default bg-default/75 m-0 h-full min-w-0 flex-1 overflow-hidden shadow ring"
    >
      <slot />
    </div>

    <!-- 未保存更改提示弹窗 -->
    <UModal v-model:open="showDirtyModal" title="有未保存的更改">
      <template #body>
        <p class="text-muted text-sm">
          切换页面前请保存更改，或放弃未保存内容。
        </p>
      </template>
      <template #footer>
        <div class="flex justify-end gap-2">
          <UButton color="neutral" variant="subtle" @click="onDiscardChanges"
            >放弃更改</UButton
          >
          <UButton @click="onSaveAndNavigate">保存并切换</UButton>
        </div>
      </template>
    </UModal>
  </UDashboardGroup>
</template>
