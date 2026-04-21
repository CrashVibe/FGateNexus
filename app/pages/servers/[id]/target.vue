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
              @update:page="updatePage"
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
                :disabled="!isDirty || hasErrors"
                :loading="isAnyLoading"
                @click="handleSubmit"
              >
                保存配置
              </UButton>
            </div>
          </div>

          <UModal v-model:open="showAddModal" title="添加目标">
            <template #body>
              <UForm
                :schema="formSchema"
                :state="newTargetForm"
                class="space-y-4"
                @submit="handleAddTargetSubmit"
              >
                <UFormField label="目标 ID" name="targetId">
                  <UInput
                    v-model="newTargetForm.targetId"
                    class="w-full"
                    placeholder="请输入目标 ID"
                  />
                </UFormField>
                <UFormField label="类型" name="type">
                  <USelect
                    v-model="newTargetForm.type"
                    :items="targetTypeOptions"
                    class="w-full"
                  />
                </UFormField>
                <UFormField label="状态" name="enabled">
                  <USelect
                    v-model="newTargetForm.enabled"
                    :items="statusOptions"
                    class="w-full"
                  />
                </UFormField>
                <div class="mt-6 flex justify-end gap-2">
                  <UButton
                    color="neutral"
                    variant="subtle"
                    @click="showAddModal = false"
                  >
                    取消
                  </UButton>
                  <UButton type="submit"> 添加 </UButton>
                </div>
              </UForm>
            </template>
          </UModal>

          <UModal v-model:open="showDeleteModal" title="确认删除">
            <template #body>
              <p>确定要删除这个目标吗？此操作不可逆。</p>
              <div class="mt-6 flex justify-end gap-2">
                <UButton
                  color="neutral"
                  variant="subtle"
                  @click="showDeleteModal = false"
                >
                  取 消
                </UButton>
                <UButton
                  :loading="loadingMap.isSubmitting"
                  color="error"
                  @click="confirmDelete"
                >
                  确认删除
                </UButton>
              </div>
            </template>
          </UModal>
        </UContainer>
      </template>
    </UDashboardPanel>
  </div>
</template>

<script lang="tsx" setup>
import type { TableColumn } from "@nuxt/ui";
import { getPaginationRowModel } from "@tanstack/vue-table";
import {isEqual, keyBy} from "lodash-es";
import { z } from "zod";

import type {
  targetResponse,
  targetSchemaRequestType,
} from "#shared/model/server/target";
import {targetSchemaRequest} from "#shared/model/server/target";
import ServerHeader from "@/components/header/server-header.vue";
import { TargetData } from "~/composables/api";
import {UButton, USelect, UInput, UFormField} from "#components";

const table = useTemplateRef("table");
const pagination = ref({ pageIndex: 0, pageSize: 10 });
const globalFilter = ref("");
const showAddModal = ref(false);
const showDeleteModal = ref(false);
const targetToDelete = ref<string | null>(null);

const updatePage = (p: number) => {
  table.value?.tableApi?.setPageIndex(p - 1);
};

const newTargetForm = reactive({
  enabled: "enable" as "enable" | "disable",
  targetId: "",
  type: "group" as "group" | "private",
});

const formSchema = z.object({
  enabled: z.enum(['enable', 'disable']),
  targetId: z.string().nonempty('目标 ID 不能为空'),
  type: z.enum(['group', 'private']),
});

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
    enabled: row.enabled,
    targetId: row.targetId.trim(),
    type: row.type,
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

const openDeleteModal = (id: string) => {
  targetToDelete.value = id;
  showDeleteModal.value = true;
};

const getRowTargetIdError = (index: number): string | undefined => {
  const item = formData.value[index];
  if (!item) {
    return undefined;
  }
  const tid = item.targetId?.trim();
  if (!tid) {
    return "目标 ID 不能为空";
  }

  const isDup = formData.value.some(
    (t, i) => i !== index && t.targetId.trim() === tid && t.type === item.type
  );
  if (isDup) {
    return "该组合已存在";
  }

  return undefined;
};

const hasErrors = computed(() => formData.value.some((_, idx) => !!getRowTargetIdError(idx)));

const refreshAll = async (): Promise<void> => {
  loadingMap.isLoading = true;
  try {
    const targets = await TargetData.gets(serverId);
    originalTargets = structuredClone(targets);
    formData.value = structuredClone(targets);
  } catch (error) {
    console.error(error);
    toast.add({color: "error", title: "刷新目标列表失败"});
  } finally {
    loadingMap.isLoading = false;
  }
};

const confirmDelete = async () => {
  if (!targetToDelete.value) {
    return;
  }
  loadingMap.isSubmitting = true;
  try {
    await TargetData.deletes(serverId, {ids: [targetToDelete.value]});
    toast.add({color: "success", title: "目标已删除"});
    await refreshAll();
  } catch (error) {
    console.error("删除失败：", error);
    toast.add({color: "error", title: "删除失败，请稍后再试"});
  } finally {
    showDeleteModal.value = false;
    targetToDelete.value = null;
    loadingMap.isSubmitting = false;
  }
};

const columns: TableColumn<targetResponse>[] = [
  {
    accessorKey: "targetId",
    cell: ({row}) => {
      const errorMsg = getRowTargetIdError(row.index);
      return (
        <UFormField error={errorMsg}>
          <UInput
            color={errorMsg ? "error" : undefined}
            modelValue={row.original.targetId ? String(row.original.targetId) : ""}
            onUpdate:modelValue={(v: string | number | undefined | boolean) => {
              const item = formData.value[row.index];
              if (item) {
                item.targetId = String(v ?? "");
              }
            }}
            placeholder="请输入目标 ID"
          />
        </UFormField>
      );
    },
    header: "目标 ID",
  },
  {
    accessorKey: "type",
    cell: ({row}) => (
      <USelect
        items={targetTypeOptions}
        modelValue={row.original.type}
        onUpdate:modelValue={(v: string | number | boolean | undefined) => {
          const item = formData.value[row.index];
          if (item) {
            item.type = String(v) as "group" | "private";
          }
        }}
      />
    ),
    header: "类型",
  },
  {
    accessorKey: "enabled",
    cell: ({row}) => (
      <USelect
        items={statusOptions}
        modelValue={row.original.enabled ? "enable" : "disable"}
        onUpdate:modelValue={(v: string | number | boolean | undefined) => {
          const item = formData.value[row.index];
          if (item) {
            item.enabled = String(v) === "enable";
          }
        }}
      />
    ),
    header: "状态",
  },
  {
    cell: ({ row }) => {
      const { id } = row.original;
      return (
        <UButton
          color="error"
          size="sm"
          variant="subtle"
          onClick={() => {
            if (id) {
              openDeleteModal(id);
            }
          }}
        >
          删除
        </UButton>
      );
    },
    header: "操作",
    id: "actions",
  },
];

const addTarget = () => {
  newTargetForm.targetId = "";
  newTargetForm.type = "group";
  newTargetForm.enabled = "enable";
  showAddModal.value = true;
};

const handleAddTargetSubmit = async () => {
  const targetId = newTargetForm.targetId.trim();
  const {type} = newTargetForm;

  const isDuplicate = formData.value.some(
    (t) => t.targetId.trim() === targetId && t.type === type
  );
  if (isDuplicate) {
    toast.add({
      color: "warning",
      title: `目标 ID "${targetId}" + 类型 "${type === "group" ? "群聊" : "私聊"}" 已经存在`,
    });
    return;
  }

  loadingMap.isSubmitting = true;
  try {
    const req = targetSchemaRequest.parse({
      config: {},
      enabled: newTargetForm.enabled === "enable",
      targetId,
      type,
    });

    await TargetData.creates(serverId, [req]);
    toast.add({color: "success", title: "目标已添加"});
    showAddModal.value = false;
    await refreshAll();
  } catch (error) {
    console.error("添加失败：", error);
    toast.add({color: "error", title: "添加失败，请稍后再试"});
  } finally {
    loadingMap.isSubmitting = false;
  }
};

const handleSubmit = async () => {
  const originalById = keyBy(originalTargets, "id");
  const toUpdate = formData.value.filter((t) => {
    const ori = originalById[t.id];
    return (
      ori &&
      !isSameTarget(
        { enabled: t.enabled, targetId: t.targetId, type: t.type },
        { enabled: ori.enabled, targetId: ori.targetId, type: ori.type },
      )
    );
  });

  if (!toUpdate.length || !isDirty.value) {
    return;
  }

  loadingMap.isSubmitting = true;
  try {
    await TargetData.updates(serverId, {
      items: toUpdate.map((row) => ({
        data: buildRequestFromRow(row),
        id: row.id,
      })),
    });

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
  formData.value = structuredClone(originalTargets);
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
