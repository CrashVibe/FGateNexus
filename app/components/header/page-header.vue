<script setup lang="ts">
interface PageHeaderProps {
  title: string;
  description?: string;
}

const { title, description = null } = defineProps<PageHeaderProps>();
</script>

<template>
  <UDashboardNavbar>
    <template #leading>
      <UDashboardSidebarCollapse />
    </template>
    <template #title>
      <span class="text-2xl font-bold">{{ title }}</span>
      <span
        v-if="description"
        class="text-muted max-w-xs self-end truncate text-sm font-normal"
        :title="description"
      >
        {{ description }}
      </span>
    </template>
    <template v-if="$slots.actions" #right>
      <slot name="actions" />
    </template>
  </UDashboardNavbar>
</template>
