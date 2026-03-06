<script lang="ts" setup>
import hljs from "highlight.js/lib/core";
import typescript from "highlight.js/lib/languages/typescript";
import { darkTheme } from "naive-ui";
import type { GlobalTheme } from "naive-ui";
import { ref } from "vue";

import { themeOverrides } from "~/utils/color";

hljs.registerLanguage("typescript", typescript);

const colorMode = useColorMode();

const theme = ref<GlobalTheme | null>(colorMode.value === "dark" ? darkTheme : null);

watch(colorMode, async (mode) => {
  // 不加这个会没有自带的过渡效果
  await nextTick();
  theme.value = mode.value === "dark" ? darkTheme : null;
});
</script>

<template>
  <UApp>
    <n-config-provider
      :hljs="hljs"
      :theme="theme"
      :theme-overrides="themeOverrides"
    >
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
