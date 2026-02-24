<script lang="ts" setup>
import { isMobile } from "#imports";
import { computed } from "vue";
import type { RouteLocationAsPathGeneric } from "vue-router";
import Header from "~/components/layouts/Header.vue";
import { useSidebarCollapsed } from "~/composables/useSidebarCollapsed";
import type { MenuItem } from "~/layouts/default.vue";

interface Props {
  menuOptions?: MenuItem[];
  onMenuSelect?: (key: RouteLocationAsPathGeneric) => void;
}
const menuKey = computed(() => props.menuOptions.map((i) => i.key).join("-"));

const props = withDefaults(defineProps<Props>(), {
  menuOptions: () => [],
  onMenuSelect: () => {}
});

const route = useRoute();
const { collapsed, handleCollapse, handleExpand } = useSidebarCollapsed();

const selectedKey = computed(() => route.path);

const handleMenuSelect = (key: RouteLocationAsPathGeneric) => {
  props.onMenuSelect?.(key);
};
</script>

<template>
  <n-layout bordered position="absolute">
    <n-layout bordered has-sider position="absolute">
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
        <router-link to="/">
          <div
            class="flex h-(--header-height) items-center justify-center space-x-2 border-b border-(--n-border-color)"
          >
            <n-image class="size-10 align-middle" preview-disabled src="/favicon.ico" />
            <n-text class="align-middle text-xl" strong>FlowGate</n-text>
          </div>
        </router-link>
        <transition name="page-jump-in" mode="out-in">
          <n-menu
            :key="menuKey"
            :value="selectedKey"
            :collapsed="collapsed"
            :options="props.menuOptions"
            :indent="24"
            @update:value="handleMenuSelect"
          />
        </transition>
      </n-layout-sider>
      <n-layout>
        <Header />
        <n-layout-content :native-scrollbar="false">
          <div class="mx-auto h-full p-8 pt-12 pb-24">
            <slot />
          </div>
        </n-layout-content>
      </n-layout>
    </n-layout>
  </n-layout>
</template>

<style lang="scss" scoped>
.n-menu {
  padding-bottom: 14px;
  overflow: visible;
  :deep(.n-menu-item) {
    .n-menu-item-content {
      &::before {
        border-left: 4px solid transparent;
        transition:
          border 0.3s var(--n-bezier),
          background-color 0.3s var(--n-bezier);
      }
      &.n-menu-item-content--selected {
        .n-text {
          color: var(--primary-hex);
        }
        &::before {
          border-left-color: var(--n-item-text-color-active);
        }
      }
    }
  }
  &.cover {
    :deep(.n-submenu-children) {
      --n-item-height: 50px;
    }
  }
}
</style>
