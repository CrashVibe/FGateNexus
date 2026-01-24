<template>
    <n-dropdown :options="themeOptions" trigger="click" @select="handleThemeSelect">
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
        light: "light",
        dark: "dark"
    }
});

const handleThemeSelect = (key: "light" | "dark" | "auto") => {
    colorMode.store.value = key;
};

const currentThemeIcon = computed(() => {
    const mode = colorMode.store.value;
    return mode === "light" ? SunnyOutline : mode === "dark" ? MoonOutline : TvOutline;
});

const themeOptions = [
    { label: "浅色模式", key: "light", icon: () => h(NIcon, { component: SunnyOutline }) },
    { label: "深色模式", key: "dark", icon: () => h(NIcon, { component: MoonOutline }) },
    { label: "跟随系统", key: "auto", icon: () => h(NIcon, { component: TvOutline }) }
];
</script>
