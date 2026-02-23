<script lang="ts" setup>
import { useColorMode } from "@vueuse/core";
import { darkTheme, type GlobalTheme } from "naive-ui";
import { onMounted, ref } from "vue";
import { themeOverrides } from "~/utils/color";

import hljs from "highlight.js/lib/core";
import typescript from "highlight.js/lib/languages/typescript";

hljs.registerLanguage("typescript", typescript);

const router = useRouter();
const colorMode = useColorMode();

const theme = ref<GlobalTheme | null>(colorMode.value === "dark" ? darkTheme : null);

watch(colorMode, async (mode) => {
  await nextTick(); // 不加这个会没有自带的过渡效果
  theme.value = mode === "dark" ? darkTheme : null;
});

const loadingBarRef = ref();

onMounted(() => {
  let isNavigating = false;
  const callLoadingBar = (method: "start" | "finish" | "error") => {
    loadingBarRef.value?.[method]?.();
  };

  router.beforeEach((to, from) => {
    if (to.path !== from.path && !isNavigating) {
      isNavigating = true;
      callLoadingBar("start");
    }
    return true;
  });

  router.afterEach(() => {
    if (isNavigating) {
      setTimeout(() => {
        callLoadingBar("finish");
        isNavigating = false;
      }, 100);
    }
  });

  router.onError((error) => {
    console.error("[FAILED] Router error:", error);
    callLoadingBar("error");
    isNavigating = false;
  });
});
</script>

<template>
  <n-config-provider :hljs="hljs" :theme="theme" :theme-overrides="themeOverrides">
    <n-loading-bar-provider ref="loadingBarRef">
      <n-message-provider>
        <n-dialog-provider>
          <NuxtLayout>
            <NuxtPage />
          </NuxtLayout>
        </n-dialog-provider>
      </n-message-provider>
    </n-loading-bar-provider>
  </n-config-provider>
</template>
