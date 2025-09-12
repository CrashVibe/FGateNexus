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

// 全局认证状态管理
const { checkAuthStatus } = useAuth();
const route = useRoute();

// 全局认证状态
const authStore = reactive({
  isAuthenticated: false,
  isLoading: false
});

// 检查认证状态
const checkAuth = async () => {
  authStore.isLoading = true;
  try {
    const status = await checkAuthStatus();
    authStore.isAuthenticated = status.isAuthenticated;
  } catch (error) {
    console.error("Auth check failed:", error);
    authStore.isAuthenticated = false;
  } finally {
    authStore.isLoading = false;
  }
};

// 全局认证状态
const nuxtApp = useNuxtApp();
nuxtApp.provide("authStore", authStore);

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

  // 初始检查认证状态
  checkAuth();
});

// 更新认证状态
watch(
  () => route.path,
  () => {
    checkAuth();
  },
  { immediate: true }
);
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
