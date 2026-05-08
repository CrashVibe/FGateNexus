<template>
  <div class="py-12">
    <div class="flex flex-col items-center gap-3">
      <UIcon name="i-lucide-loader-2" class="text-muted size-6 animate-spin" />
      <p class="text-muted text-sm">{{ displayText }}</p>
    </div>
  </div>
</template>

<script lang="ts" setup>
const props = defineProps<{ text?: string }>();

const displayText = computed(() => props.text ?? "正在加载配置...");
</script>
