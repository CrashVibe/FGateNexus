<template>
  <transition appear name="card-appear">
    <div
      :class="[
        'cursor-pointer transition-all duration-300 ease-in-out hover:scale-[0.99] hover:opacity-80',
        { 'grayscale-[0.8]': !botId.isOnline },
      ]"
      @click="emit('click', botId.id)"
    >
      <UCard>
        <div class="flex flex-col gap-3">
          <!-- head -->
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2">
              <span class="text-lg font-semibold"># {{ botId.id }}</span>
              <UBadge
                :color="botId.isOnline ? 'success' : 'error'"
                variant="subtle"
                size="sm"
              >
                {{ botId.isOnline ? "在线" : "离线" }}
              </UBadge>
              <span class="text-muted text-sm">{{ botId.platform }}</span>
            </div>
          </div>

          <div class="flex items-center justify-center">
            <span class="text-primary text-2xl font-semibold">{{
              botId.name || botId.platform
            }}</span>
          </div>

          <div class="flex items-center justify-between text-sm">
            <span class="text-muted">机器人开关</span>
            <UBadge
              :color="botId.enabled ? 'success' : 'warning'"
              variant="subtle"
              size="sm"
            >
              {{ botId.enabled ? "启用" : "禁用" }}
            </UBadge>
          </div>

          <span class="text-muted text-right text-xs opacity-70 select-none"
            >点击卡片修改配置</span
          >
        </div>
      </UCard>
    </div>
  </transition>
</template>

<script lang="ts" setup>
import type { BotWithStatus } from "~~/shared/model/bot/api";

const { botId } = defineProps<{
  botId: BotWithStatus;
}>();

const emit = defineEmits<{
  click: [id: number];
}>();
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
