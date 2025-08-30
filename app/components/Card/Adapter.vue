<template>
  <transition appear name="card-appear">
    <n-card
      :class="{ 'grayscale-[0.6]': !adapter.isOnline }"
      class="transition-all duration-300 ease-in-out cursor-pointer hover:-translate-y-1 hover:shadow-xl"
      hoverable
      @click="emit('click', adapter.id)"
    >
      <div class="flex flex-col gap-3">
        <!-- head -->
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2">
            <n-text class="text-lg" strong># {{ adapter.id }}</n-text>
            <n-tag :bordered="false" :type="adapter.isOnline ? 'success' : 'error'" size="small">
              {{ adapter.isOnline ? "在线" : "离线" }}
            </n-tag>
            <n-text>{{ adapter.type }}</n-text>
          </div>
        </div>

        <div class="flex items-center justify-center">
          <n-text class="text-2xl text-primary" strong>{{ adapter.name || adapter.type }}</n-text>
        </div>

        <div class="flex items-center justify-between text-sm">
          <n-text depth="2">适配器开关</n-text>
          <n-tag :bordered="false" :type="adapter.isOnline ? 'success' : 'warning'" size="small">
            {{ adapter.enabled ? "启用" : "禁用" }}
          </n-tag>
        </div>

        <n-text class="text-xs text-right select-none opacity-70" depth="3">点击卡片修改配置</n-text>
      </div>
    </n-card>
  </transition>
</template>

<script lang="ts" setup>
import type { AdapterWithStatus } from "#shared/schemas/adapter";

defineProps<{
  adapter: AdapterWithStatus;
}>();

const emit = defineEmits(["click"]);
</script>

<style scoped>
/* 动画 */
.card-appear-enter-active {
  transition: all 0.6s cubic-bezier(0.23, 1, 0.32, 1);
}

.card-appear-enter-from {
  opacity: 0;
  transform: scale(0.8) translateY(20px);
}

.card-appear-enter-to {
  opacity: 1;
  transform: scale(1) translateY(0);
}
</style>
