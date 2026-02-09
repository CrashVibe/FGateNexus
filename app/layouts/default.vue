<script lang="ts" setup>
import { LinkOutline, MenuOutline, PeopleOutline, SettingsOutline } from "@vicons/ionicons5";
import type { MenuMixedOption } from "naive-ui/es/menu/src/interface";
import type { RouteLocationAsPathGeneric } from "vue-router";
import SidebarLayout from "~/components/layouts/SidebarLayout.vue";

const router = useRouter();
const route = useRoute();

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

const handleMenuSelect = (key: RouteLocationAsPathGeneric) => {
  const targetPath = String(key);
  if (targetPath && targetPath !== route.path) {
    router.push(targetPath).catch(() => {});
  }
};
</script>

<template>
  <SidebarLayout :menu-options="menuOptions" @menu-select="handleMenuSelect">
    <slot />
  </SidebarLayout>
</template>
