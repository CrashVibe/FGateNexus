<template>
  <div class="grid gap-3 md:grid-cols-[1fr_48px_1fr]">
    <!-- 可选面板 -->
    <div
      class="border-default flex min-h-[340px] flex-col overflow-hidden rounded-xl border"
    >
      <div
        class="border-default flex shrink-0 items-center gap-2 border-b px-3 py-2.5"
      >
        <UIcon name="i-lucide-list" class="text-muted size-4 shrink-0" />
        <span class="text-sm font-medium">可选频道</span>
        <UBadge variant="subtle" size="sm" class="ml-auto">
          {{ availableItems.length }}
        </UBadge>
      </div>

      <div
        v-if="error"
        class="flex flex-1 flex-col items-center justify-center gap-3 p-6 text-center"
      >
        <UIcon name="i-lucide-wifi-off" class="text-muted size-8" />
        <p class="text-muted text-sm">加载失败，请重试</p>
        <UButton size="sm" color="error" variant="soft" @click="reload">
          重试
        </UButton>
      </div>

      <UListbox
        v-else
        v-model="availablePicked"
        multiple
        value-key="value"
        class="min-h-0 flex-1"
        :items="availableItems"
        :loading="loading"
        :filter="{ placeholder: '搜索...' }"
      >
        <template #empty>
          <div class="flex flex-col items-center gap-2 py-10 text-center">
            <UIcon
              v-if="!loading"
              name="i-lucide-inbox"
              class="text-muted size-7"
            />
            <span class="text-muted text-sm">{{
              loading ? "加载中..." : "暂无可选频道"
            }}</span>
          </div>
        </template>
      </UListbox>
    </div>

    <!-- 中间操作列 -->
    <div
      class="flex flex-row items-center justify-center gap-1 md:flex-col md:pt-10"
    >
      <UTooltip text="全部添加" :delay-duration="300">
        <UButton
          icon="i-lucide-chevrons-right"
          color="neutral"
          variant="ghost"
          size="sm"
          :disabled="availableItems.length === 0"
          @click="addAll"
        />
      </UTooltip>
      <UTooltip text="添加选中" :delay-duration="300">
        <UButton
          icon="i-lucide-chevron-right"
          size="sm"
          :disabled="availablePicked.length === 0"
          @click="addPicked"
        />
      </UTooltip>
      <USeparator
        orientation="horizontal"
        class="my-1 hidden w-6 self-center md:block"
      />
      <UTooltip text="移除选中" :delay-duration="300">
        <UButton
          icon="i-lucide-chevron-left"
          color="neutral"
          variant="soft"
          size="sm"
          :disabled="selectedPicked.length === 0"
          @click="removePicked"
        />
      </UTooltip>
    </div>

    <!-- 已选面板 -->
    <div
      class="border-default flex min-h-[340px] flex-col overflow-hidden rounded-xl border"
    >
      <div
        class="border-default flex shrink-0 items-center gap-2 border-b px-3 py-2.5"
      >
        <UIcon
          name="i-lucide-check-circle"
          class="text-success size-4 shrink-0"
        />
        <span class="text-sm font-medium">已选频道</span>
        <UBadge
          v-if="selectedItems.length > 0"
          color="success"
          variant="subtle"
          size="sm"
          class="ml-auto"
        >
          {{ selectedItems.length }}
        </UBadge>
        <UButton
          v-if="selectedItems.length > 0"
          size="xs"
          variant="ghost"
          color="neutral"
          :class="selectedItems.length === 0 ? 'ml-auto' : ''"
          @click="clearAll"
        >
          清空
        </UButton>
      </div>

      <UListbox
        v-model="selectedPicked"
        multiple
        value-key="value"
        class="min-h-0 flex-1"
        :items="selectedItems"
        :loading="loading"
        :filter="{ placeholder: '搜索...' }"
      >
        <template #empty>
          <div class="flex flex-col items-center gap-2 py-10 text-center">
            <UIcon
              v-if="!loading"
              name="i-lucide-arrow-left-right"
              class="text-muted size-7"
            />
            <span class="text-muted text-sm">{{
              loading ? "加载中..." : "从左侧选择要转发的频道"
            }}</span>
          </div>
        </template>
      </UListbox>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { ComputedRef, Ref } from "vue";
import { computed, ref, watch } from "vue";

export interface TransferItem {
  avatar?: { src: string };
  description?: string;
  label: string;
  value: string;
}

const props = defineProps<{
  error: string | null;
  items: TransferItem[];
  loading: boolean;
}>();

const emit = defineEmits<{
  reload: [];
}>();

const selected = defineModel<Set<string>>("selected", { required: true });

const availablePicked = ref<string[]>([]);
const selectedPicked = ref<string[]>([]);

const selectedItems = computed(() =>
  props.items.filter((item) => selected.value.has(item.value)),
);

const availableItems = computed(() =>
  props.items.filter((item) => !selected.value.has(item.value)),
);

const setSelected = (nextValues: Iterable<string>) => {
  selected.value = new Set(nextValues);
};

const addPicked = () => {
  if (availablePicked.value.length === 0) {
    return;
  }

  const next = new Set(selected.value);
  for (const value of availablePicked.value) {
    next.add(value);
  }
  setSelected(next);
  availablePicked.value = [];
};

const removePicked = () => {
  if (selectedPicked.value.length === 0) {
    return;
  }

  const next = new Set(selected.value);
  for (const value of selectedPicked.value) {
    next.delete(value);
  }
  setSelected(next);
  selectedPicked.value = [];
};

const addAll = () => {
  setSelected(props.items.map((item) => item.value));
  availablePicked.value = [];
};

const clearAll = () => {
  setSelected([]);
  selectedPicked.value = [];
};

const reload = () => {
  emit("reload");
};

const syncPicked = (
  picked: Ref<string[]>,
  items: ComputedRef<TransferItem[]>,
) => {
  watch(
    () => items.value.map((item) => item.value),
    (values) => {
      const valid = new Set(values);
      picked.value = picked.value.filter((value) => valid.has(value));
    },
    { immediate: true },
  );
};

syncPicked(availablePicked, availableItems);
syncPicked(selectedPicked, selectedItems);
</script>
