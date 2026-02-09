<script lang="ts" setup>
import { isMobile } from "#imports";
import type { MenuMixedOption } from "naive-ui/es/menu/src/interface";
import { computed } from "vue";
import type { RouteLocationAsPathGeneric } from "vue-router";
import Header from "~/components/layouts/Header.vue";
import { useSidebarCollapsed } from "~/composables/useSidebarCollapsed";

interface Props {
  menuOptions?: MenuMixedOption[];
  onMenuSelect?: (key: RouteLocationAsPathGeneric) => void;
}

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
        <n-menu
          :value="selectedKey"
          :collapsed="collapsed"
          :options="props.menuOptions"
          @update:value="handleMenuSelect"
        />
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
@use "../../layouts/css/main.scss";
</style>
