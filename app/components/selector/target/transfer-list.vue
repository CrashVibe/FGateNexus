<template>
  <div class="grid gap-3 md:grid-cols-[1fr_auto_1fr]">
    <UCard>
      <template #header>
        <div class="flex items-center justify-between">
          <span class="text-sm font-medium"
            >可选项 ({{ availableItems.length }})</span
          >
          <UButton
            size="xs"
            variant="ghost"
            :disabled="availableItems.length === 0"
            @click="addAll"
          >
            全部添加
          </UButton>
        </div>
      </template>

      <UAlert
        v-if="error"
        color="error"
        variant="subtle"
        title="加载失败"
        :description="error"
      />
      <UButton
        v-if="error"
        class="mt-2"
        color="error"
        variant="soft"
        @click="reload"
      >
        重试
      </UButton>

      <UListbox
        v-else
        v-model="availablePicked"
        multiple
        value-key="value"
        class="size-full"
        :items="availableItems"
        :loading="loading"
        :filter="{ placeholder: '搜索可选项...' }"
      >
        <template #empty>
          {{ loading ? "加载中..." : "暂无可选项" }}
        </template>
      </UListbox>
    </UCard>

    <div class="flex flex-row items-center justify-center gap-2 md:flex-col">
      <UButton
        icon="i-lucide-chevron-right"
        :disabled="availablePicked.length === 0"
        @click="addPicked"
      />
      <UButton
        icon="i-lucide-chevron-left"
        color="neutral"
        variant="soft"
        :disabled="selectedPicked.length === 0"
        @click="removePicked"
      />
      <UButton
        icon="i-lucide-chevrons-left"
        color="neutral"
        variant="ghost"
        :disabled="selectedItems.length === 0"
        @click="clearAll"
      />
    </div>

    <UCard>
      <template #header>
        <div class="flex items-center justify-between">
          <span class="text-sm font-medium"
            >已选择 ({{ selectedItems.length }})</span
          >
          <UButton
            size="xs"
            variant="ghost"
            :disabled="selectedItems.length === 0"
            @click="clearAll"
          >
            清空
          </UButton>
        </div>
      </template>

      <UListbox
        v-model="selectedPicked"
        multiple
        value-key="value"
        class="size-full"
        :items="selectedItems"
        :loading="loading"
        :filter="{ placeholder: '搜索已选项...' }"
      >
        <template #empty>
          {{ loading ? "加载中..." : "暂无已选项" }}
        </template>
      </UListbox>
    </UCard>
  </div>
</template>

<script setup lang="ts">
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

watch(
  () => availableItems.value.map((item) => item.value),
  (values) => {
    const valid = new Set(values);
    availablePicked.value = availablePicked.value.filter((value) =>
      valid.has(value),
    );
  },
  { immediate: true },
);

watch(
  () => selectedItems.value.map((item) => item.value),
  (values) => {
    const valid = new Set(values);
    selectedPicked.value = selectedPicked.value.filter((value) =>
      valid.has(value),
    );
  },
  { immediate: true },
);
</script>
