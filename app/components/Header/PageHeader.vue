<script setup lang="ts">
defineProps<{
  title: string;
  description?: string;
}>();
</script>

<template>
  <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
    <div class="flex flex-col gap-2">
      <div class="flex items-center gap-2">
        <h1 class="text-2xl font-semibold sm:text-3xl">{{ title }}</h1>
        <UDashboardSidebarToggle variant="subtle" />
      </div>
      <h2 v-if="description" class="text-sm text-gray-400 sm:text-base">
        {{ description }}
      </h2>
    </div>

    <div>
      <slot name="actions" />
    </div>
  </div>
</template>
