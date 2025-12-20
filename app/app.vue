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

const themeOverrides: GlobalThemeOverrides = {};

const loadingBarRef = ref();

onMounted(() => {
  const router = useRouter();
  let isNavigating = false;

  nextTick(() => {
    setTimeout(() => {
      const safeCall = (method: string) => {
        try {
          if (loadingBarRef.value && typeof loadingBarRef.value[method] === "function") {
            loadingBarRef.value[method]();
            return true;
          }
        } catch (error) {
          console.warn(`[WARNING] Error calling loadingBar.${method}:`, error);
        }
        return false;
      };

      router.beforeEach((to, from) => {
        if (to.path !== from.path && !isNavigating) {
          isNavigating = true;
          safeCall("start");
        }
        return true;
      });

      router.afterEach(() => {
        if (isNavigating) {
          setTimeout(() => {
            safeCall("finish");
            isNavigating = false;
          }, 100);
        }
      });

      router.onError((error) => {
        console.error("[FAILED] Router error:", error);
        safeCall("error");
        isNavigating = false;
      });

      setTimeout(() => {
        if (safeCall("start")) {
          setTimeout(() => {
            safeCall("finish");
          }, 1000);
        }
      }, 2000);
    }, 300);
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
