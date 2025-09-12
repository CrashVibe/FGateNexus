<script lang="ts" setup>
import { LogOutOutline, SettingsOutline } from "@vicons/ionicons5";

interface Props {
  showSettings?: boolean;
  showLogout?: boolean;
}

interface AuthStore {
  isAuthenticated: boolean;
  isLoading: boolean;
}

const _props = withDefaults(defineProps<Props>(), {
  showSettings: true,
  showLogout: true
});

const router = useRouter();
const { logout } = useAuth();

// 从全局状态获取认证状态
const { $authStore } = useNuxtApp();
const authStore = $authStore as AuthStore;
const isAuthenticated = computed(() => authStore?.isAuthenticated || false);

const navigateToSettings = () => {
  router.push("/settings").catch(() => {});
};

const handleLogout = async () => {
  await logout();
};
</script>

<template>
  <n-layout-header bordered class="h-[var(--header-height)] p-4">
    <n-space justify="space-between">
      <n-space align="center" size="large">
        <n-image class="align-middle size-8" preview-disabled src="/favicon.ico" />
        <n-text class="text-base align-middle" strong>FGATE</n-text>
      </n-space>
      <n-space align="center" size="large">
        <n-button v-if="showSettings" circle quaternary @click="navigateToSettings">
          <template #icon>
            <n-icon :component="SettingsOutline" />
          </template>
        </n-button>
        <n-button v-if="showLogout && isAuthenticated" circle quaternary @click="handleLogout">
          <template #icon>
            <n-icon :component="LogOutOutline" />
          </template>
        </n-button>
        <ThemeToggle />
      </n-space>
    </n-space>
  </n-layout-header>
</template>
