<script lang="ts" setup>
import { useColorMode } from "@vueuse/core";
import { darkTheme, type GlobalTheme } from "naive-ui";
import { ref } from "vue";
import { themeOverrides } from "~/utils/color";

import hljs from "highlight.js/lib/core";
import typescript from "highlight.js/lib/languages/typescript";

hljs.registerLanguage("typescript", typescript);

const colorMode = useColorMode();

const theme = ref<GlobalTheme | null>(colorMode.value === "dark" ? darkTheme : null);

watch(colorMode, async (mode) => {
  await nextTick(); // 不加这个会没有自带的过渡效果
  theme.value = mode === "dark" ? darkTheme : null;
});
</script>

<template>
  <UApp>
    <n-config-provider :hljs="hljs" :theme="theme" :theme-overrides="themeOverrides">
      <n-message-provider>
        <n-dialog-provider>
          <NuxtLoadingIndicator color="var(--ui-primary)" />
          <NuxtLayout>
            <NuxtPage />
          </NuxtLayout>
        </n-dialog-provider>
      </n-message-provider>
    </n-config-provider>
  </UApp>
</template>
