<script lang="ts" setup>
import { useDark } from "@vueuse/core";
import { darkTheme, lightTheme, type GlobalThemeOverrides } from "naive-ui";
import { computed, onMounted, ref } from "vue";

import hljs from "highlight.js/lib/core";
import typescript from "highlight.js/lib/languages/typescript";

hljs.registerLanguage("typescript", typescript);

const isDark = useDark({
  storageKey: "vueuse-color-scheme",
  selector: "html",
  attribute: "class",
  valueDark: "dark",
  valueLight: "light"
});

const theme = computed(() => (isDark.value ? darkTheme : lightTheme));

const themeOverrides: GlobalThemeOverrides = {
  LoadingBar: {
    height: "4px"
  }
};

const loadingBarRef = ref();

onMounted(() => {
  const router = useRouter();
  let isNavigating = false;

  nextTick(() => {
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
});
</script>

<template>
  <n-config-provider :hljs="hljs" :theme="theme" :theme-overrides="themeOverrides">
    <n-global-style />
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
