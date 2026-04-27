<script setup lang="ts">
import { zh_cn } from "#ui/locale";
</script>

<template>
  <UApp :toaster="{ position: 'top-right' }" :locale="zh_cn">
    <NuxtLoadingIndicator color="var(--ui-primary)" />
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
  </UApp>
</template>
