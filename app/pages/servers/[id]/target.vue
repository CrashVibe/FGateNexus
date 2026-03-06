<template>
  <div class="h-full">
    <UDashboardPanel
      class="scrollbar-custom h-full"
      :ui="{ body: 'p-0 sm:p-0 overflow-y-auto overscroll-none' }"
    >
      <template #header>
        <ServerHeader />
      </template>
      <template #body>
        <UContainer class="py-8">
          <div class="mb-4 flex items-center justify-between gap-4">
            <UInput
              v-model="globalFilter"
              class="max-w-xs"
              icon="i-lucide-search"
              placeholder="搜索目标 ID / 类型..."
            />
            <UButton icon="i-lucide-plus" @click="addTarget">添加目标</UButton>
          </div>
          <UTable
            ref="table"
            v-model:pagination="pagination"
            v-model:global-filter="globalFilter"
            :data="formData"
            :columns="columns"
            :pagination-options="{
              autoResetPageIndex: false,
              getPaginationRowModel: getPaginationRowModel(),
            }"
          >
            <template #empty>
              <div class="flex flex-col items-center gap-4 py-8">
                <template v-if="globalFilter">
                  <p class="text-muted">
                    没有找到匹配 "{{ globalFilter }}" 的目标
                  </p>
                  <UButton
                    variant="subtle"
                    color="neutral"
                    @click="globalFilter = ''"
                    >清除搜索</UButton
                  >
                </template>
                <template v-else>
                  <p class="text-muted">暂无目标配置，请添加目标</p>
                  <UButton @click="addTarget">添加目标</UButton>
                </template>
              </div>
            </template>
          </UTable>
          <div
            class="border-default mt-4 flex items-center justify-between border-t px-4 pt-4"
          >
            <UPagination
              :page="
                (table?.tableApi?.getState().pagination.pageIndex || 0) + 1
              "
              :items-per-page="table?.tableApi?.getState().pagination.pageSize"
              :total="table?.tableApi?.getFilteredRowModel().rows.length"
              @update:page="(p) => table?.tableApi?.setPageIndex(p - 1)"
            />
            <div class="flex gap-2">
              <UButton
                color="neutral"
                variant="subtle"
                :disabled="!isDirty"
                :loading="isAnyLoading"
                @click="cancelChanges"
                >取消更改</UButton
              >
              <UButton
                :disabled="!isDirty"
                :loading="isAnyLoading"
                @click="handleSubmit"
              >
                保存配置
              </UButton>
            </div>
          </div>
        </UContainer>
      </template>
    </UDashboardPanel>
  </div>
</template>

<script lang="ts" setup>
import type { TableColumn } from "@nuxt/ui";
import { getPaginationRowModel } from "@tanstack/vue-table";
import { groupBy, isEqual, keyBy } from "lodash-es";
import { v4 as uuidv4 } from "uuid";
import { z } from "zod";
import {
  targetSchema,
  targetSchemaRequest,
} from "~~/shared/schemas/server/target";
import type {
  targetResponse,
  targetSchemaRequestType,
} from "~~/shared/schemas/server/target";

import ServerHeader from "@/components/header/server-header.vue";
import { TargetData } from "~/composables/api";

const UInput = resolveComponent("UInput");
const USelect = resolveComponent("USelect");
const UButton = resolveComponent("UButton");

const table = useTemplateRef("table");
const pagination = ref({ pageIndex: 0, pageSize: 10 });
const globalFilter = ref("");

watch(globalFilter, () => {
  pagination.value.pageIndex = 0;
});

const { setPageState, clearPageState } = usePageStateStore();
definePageMeta({ layout: "default" });

const route = useRoute();
const toast = useToast();
const isSameTarget = (
  a: Pick<targetResponse, "targetId" | "type" | "enabled">,
  b: Pick<targetResponse, "targetId" | "type" | "enabled">,
) => a.targetId === b.targetId && a.type === b.type && a.enabled === b.enabled;
const serverId = Number(route.params?.["id"]);

const buildRequestFromRow = (row: targetResponse): targetSchemaRequestType =>
  targetSchemaRequest.parse({
    config: row.config,
    enabled: !!row.enabled,
    targetId: row.targetId.trim(),
    type: row.type,
  });

const getDefaultTarget = (): targetResponse =>
  targetSchema.extend({ targetId: z.string().default("") }).parse({
    id: `temp-${uuidv4()}`,
  });

let originalTargets: targetResponse[] = [];

const formData = ref<targetResponse[]>([]);

const isDirty = computed(() => !isEqual(formData.value, originalTargets));
const loadingMap = reactive({
  isLoading: true,
  isSubmitting: false,
});

const isAnyLoading = computed(() => Object.values(loadingMap).some(Boolean));

const targetTypeOptions = [
  { label: "群聊", value: "group" },
  { label: "私聊", value: "private" },
];

const statusOptions = [
  { label: "已启用", value: "enable" },
  { label: "已禁用", value: "disable" },
];

const removeTargetById = (id: string) => {
  const idx = formData.value.findIndex((t) => t.id === id);
  if (idx !== -1) {
    formData.value.splice(idx, 1);
  }
};

const columns: TableColumn<targetResponse>[] = [
  {
    accessorKey: "targetId",
    cell: ({ row }) =>
      h(UInput, {
        modelValue: row.original.targetId,
        "onUpdate:modelValue": (v: string) => {
          const item = formData.value[row.index];
          if (item) {
            item.targetId = v;
          }
        },
        placeholder: "请输入目标 ID",
      }),
    header: "目标 ID",
  },
  {
    accessorKey: "type",
    cell: ({ row }) =>
      h(USelect, {
        items: targetTypeOptions,
        modelValue: row.original.type,
        "onUpdate:modelValue": (v: string) => {
          const item = formData.value[row.index];
          if (item) {
            item.type = v as "group" | "private";
          }
        },
      }),
    header: "类型",
  },
  {
    accessorKey: "enabled",
    cell: ({ row }) =>
      h(USelect, {
        items: statusOptions,
        modelValue: row.original.enabled ? "enable" : "disable",
        "onUpdate:modelValue": (v: string) => {
          const item = formData.value[row.index];
          if (item) {
            item.enabled = v === "enable";
          }
        },
      }),
    header: "状态",
  },
  {
    cell: ({ row }) => {
      const { id } = row.original;
      return h(
        UButton,
        {
          color: "error",
          onClick: () => id && removeTargetById(id),
          size: "sm",
          variant: "subtle",
        },
        () => "删除",
      );
    },
    header: "操作",
    id: "actions",
  },
];

const addTarget = () => {
  const list = formData.value;
  if (list.length > 0 && !list.at(-1)?.targetId?.trim()) {
    toast.add({
      color: "warning",
      id: "empty-target-id-warning",
      title: "请先把上一行的目标 ID 填完哦~",
    });
    return;
  }
  formData.value.push(getDefaultTarget());
};

const refreshAll = async (): Promise<void> => {
  loadingMap.isLoading = true;
  try {
    const targets = await TargetData.gets(serverId);
    originalTargets = structuredClone(targets);
    formData.value = structuredClone(targets);
  } catch (error) {
    console.error(error);
    toast.add({ color: "error", title: "刷新目标列表失败" });
  } finally {
    loadingMap.isLoading = false;
  }
};

const handleSubmit = async () => {
  // 1) 组合唯一性校验
  const keyToItems = groupBy(
    formData.value,
    (t) => `${t.targetId.trim()}::${t.type}`,
  );
  const dup = Object.entries(keyToItems).filter(
    ([, items]) => items.length > 1,
  );
  if (dup.length) {
    const msg = dup

      .map(([, items]) => {
        const [firstItem] = items;
        if (firstItem === undefined) {
          return null;
        }
        const { targetId, type } = firstItem;
        return `目标 ID "${targetId.trim()}" + 类型 "${type === "group" ? "群聊" : "私聊"}" 出现 ${items.length} 次`;
      })
      .filter(Boolean)
      .join("； ");
    toast.add({ color: "warning", title: `发现重复目标配置：${msg}` });
    return;
  }

  // 2) 差异对比
  const originalById = keyBy(originalTargets, "id");
  const currentById = keyBy(formData.value, "id");

  const toCreate = formData.value.filter((t) => t.id.startsWith("temp-"));
  const toDelete = originalTargets.filter((t) => !currentById[t.id]);
  const toUpdate = formData.value.filter((t) => {
    const ori = originalById[t.id];
    return (
      !t.id.startsWith("temp-") &&
      ori &&
      !isSameTarget(
        { enabled: t.enabled, targetId: t.targetId, type: t.type },
        { enabled: ori.enabled, targetId: ori.targetId, type: ori.type },
      )
    );
  });

  if (
    (!toCreate.length && !toUpdate.length && !toDelete.length) ||
    !isDirty.value
  ) {
    return;
  }

  // 3) 提交
  loadingMap.isSubmitting = true;
  try {
    // 3.1 批量创建
    if (toCreate.length > 0) {
      await TargetData.creates(
        serverId,
        toCreate.map((row) => buildRequestFromRow(row)),
      );
    }

    // 3.2 更新
    if (toUpdate.length > 0) {
      await TargetData.updates(serverId, {
        items: toUpdate.map((row) => ({
          data: buildRequestFromRow(row),
          id: row.id,
        })),
      });
    }

    // 3.3 删除
    if (toDelete.length > 0) {
      await TargetData.deletes(serverId, { ids: toDelete.map((r) => r.id) });
    }

    await refreshAll();
    toast.add({ color: "success", title: "配置已保存" });
  } catch (error) {
    console.error("保存失败：", error);
    toast.add({ color: "error", title: "保存配置失败，请稍后再试" });
  } finally {
    loadingMap.isSubmitting = false;
  }
};

const cancelChanges = () => {
  formData.value = structuredClone(toRaw(originalTargets));
};

onMounted(async () => {
  await refreshAll();
  setPageState({
    isDirty: () => isDirty.value,
    save: handleSubmit,
  });
});

onUnmounted(() => {
  clearPageState();
});
</script>
