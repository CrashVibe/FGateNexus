<template>
  <n-dropdown
    :options="themeOptions"
    trigger="click"
    @select="handleThemeSelect"
  >
    <n-button circle quaternary>
      <template #icon>
        <n-icon :component="currentThemeIcon" />
      </template>
    </n-button>
  </n-dropdown>
</template>

<script lang="ts" setup>
import { MoonOutline, SunnyOutline, TvOutline } from "@vicons/ionicons5";
import { useColorMode } from "@vueuse/core";
import { NButton, NDropdown, NIcon } from "naive-ui";

const colorMode = useColorMode({
  modes: {
    auto: "auto",
    dark: "dark",
    light: "light",
  },
});

const handleThemeSelect = (key: "light" | "dark" | "auto") => {
  colorMode.store.value = key;
};

const currentThemeIcon = computed(() => {
  const mode = colorMode.store.value;
  const iconMap: Record<string, Component> = {
    dark: MoonOutline,
    light: SunnyOutline,
  };
  return iconMap[mode] ?? TvOutline;
});

const themeOptions = [
  {
    icon: () => h(NIcon, { component: SunnyOutline }),
    key: "light",
    label: "浅色模式",
  },
  {
    icon: () => h(NIcon, { component: MoonOutline }),
    key: "dark",
    label: "深色模式",
  },
  {
    icon: () => h(NIcon, { component: TvOutline }),
    key: "auto",
    label: "跟随系统",
  },
];
</script>
