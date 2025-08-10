<template>
  <n-dropdown :options="themeOptions" trigger="click" @select="handleThemeSelect">
    <n-button quaternary circle>
      <template #icon>
        <n-icon :component="currentThemeIcon" />
      </template>
    </n-button>
  </n-dropdown>

  <Transition
    name="theme-fade"
    enter-active-class="transition-opacity ease-out duration-800"
    leave-active-class="transition-opacity ease-out duration-800"
    enter-from-class="opacity-0"
    enter-to-class="opacity-100"
    leave-from-class="opacity-100"
    leave-to-class="opacity-0"
  >
    <div v-if="isTransitioning" class="fixed inset-0 z-[2] pointer-events-none" :class="transitionBgColor" />
  </Transition>
</template>

<script setup lang="ts">
import { useDark, usePreferredDark, useLocalStorage } from "@vueuse/core";
import { SunnyOutline, MoonOutline, TvOutline } from "@vicons/ionicons5";
import { NButton, NDropdown, NIcon } from "naive-ui";

const isDark = useDark({
  storageKey: "vueuse-color-scheme",
  selector: "html",
  attribute: "class",
  valueDark: "dark",
  valueLight: "light"
});

const preferredDark = usePreferredDark();
const themeMode = useLocalStorage<"light" | "dark" | "auto">("theme-mode-preference", "auto");
const isTransitioning = ref(false);
const targetThemeIsDark = ref(false);

const transitionBgColor = computed(() => {
  return targetThemeIsDark.value ? "bg-gray-900" : "bg-white";
});

const getIsDarkForMode = (mode: "light" | "dark" | "auto") => {
  if (mode === "auto") {
    return preferredDark.value;
  }
  return mode === "dark";
};

const handleThemeSelect = async (key: string) => {
  const newMode = key as "light" | "dark" | "auto";
  const newIsDark = getIsDarkForMode(newMode);
  if (newIsDark === isDark.value) {
    themeMode.value = newMode;
    return;
  }

  targetThemeIsDark.value = newIsDark;
  isTransitioning.value = true;

  await new Promise((resolve) => setTimeout(resolve, 800));
  themeMode.value = newMode;
  applyTheme();

  await nextTick();
  isTransitioning.value = false;
};

const currentThemeIcon = computed(() => {
  switch (themeMode.value) {
    case "light":
      return SunnyOutline;
    case "dark":
      return MoonOutline;
    default:
      return TvOutline;
  }
});

const themeOptions = [
  {
    label: "浅色模式",
    key: "light",
    icon: () => h(NIcon, { component: SunnyOutline })
  },
  {
    label: "深色模式",
    key: "dark",
    icon: () => h(NIcon, { component: MoonOutline })
  },
  {
    label: "跟随系统",
    key: "auto",
    icon: () => h(NIcon, { component: TvOutline })
  }
];

const applyTheme = () => {
  if (themeMode.value === "auto") {
    isDark.value = preferredDark.value;
  } else {
    isDark.value = themeMode.value === "dark";
  }
};

watch(preferredDark, () => {
  if (themeMode.value === "auto") {
    applyTheme();
  }
});

watch(themeMode, applyTheme, { immediate: true });
</script>
