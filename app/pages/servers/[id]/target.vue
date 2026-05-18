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
          <LoadingState v-if="!formData && !noBotConfigured" />

          <template v-else-if="noBotConfigured">
            <div class="flex flex-col items-center gap-4 py-16">
              <p class="text-muted">请先配置 Bot 实例后再管理目标</p>
              <UButton
                :to="`/servers/${serverId}/general`"
                icon="i-lucide-settings"
              >
                前往配置 Bot 实例
              </UButton>
            </div>
          </template>

          <template v-else-if="formData">
            <div class="mb-4 flex items-center justify-between gap-4">
              <UInput
                v-model="globalFilter"
                class="max-w-xs"
                icon="i-lucide-search"
                placeholder="搜索频道 ID / 类型..."
              />
              <UButton icon="i-lucide-plus" @click="addTarget"
                >添加目标</UButton
              >
            </div>
            <UTable
              ref="table"
              v-model:pagination="pagination"
              v-model:global-filter="globalFilter"
              :data="formData"
              :columns="columns"
              :column-visibility="columnVisibility"
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
                :items-per-page="
                  table?.tableApi?.getState().pagination.pageSize
                "
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
                  :schema="TargetAPI.POST.request.element"
                  :state="newTargetForm"
                  class="space-y-4"
                  @submit="handleAddTargetSubmit"
                >
                  <UFormField label="频道 ID" name="channelId">
                    <UInput
                      v-model="newTargetForm.channelId"
                      class="w-full"
                      placeholder="请输入频道 ID"
                    />
                  </UFormField>
                  <UFormField
                    label="群组 ID"
                    name="guildId"
                    v-if="columnVisibility.guildId"
                  >
                    <UInput
                      v-model="newTargetForm.guildId"
                      class="w-full"
                      placeholder="请输入群组 ID"
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
          </template>
        </UContainer>
      </template>
    </UDashboardPanel>
  </div>
</template>

<script lang="tsx" setup>
import type { TableColumn } from "@nuxt/ui";
import { getPaginationRowModel } from "@tanstack/vue-table";
import { isEqual, keyBy } from "lodash-es";
import { PlatformType } from "~~/shared/model/bot/types";
import { TargetAPI } from '~~/shared/model/server/api';

import { UButton, USelect, UInput, UFormField } from "#components";
import type {
  targetResponse,
  targetSchemaRequestType,
} from "#shared/model/server/schema/target";
import { targetSchemaRequest } from "#shared/model/server/schema/target";
import ServerHeader from "@/components/header/server-header.vue";
import { BotData, ServerData, TargetData } from "~/composables/api";

const table = useTemplateRef("table");
const pagination = ref({ pageIndex: 0, pageSize: 10 });
const globalFilter = ref("");
const showAddModal = ref(false);
const showDeleteModal = ref(false);
const targetToDelete = ref<string | null>(null);
const noBotConfigured = ref(false);

const updatePage = (p: number) => {
  table.value?.tableApi?.setPageIndex(p - 1);
};

const newTargetForm = reactive({
  channelId: "",
  enabled: true,
  guildId: "",
  type: "group" as "group" | "private",
});

watch(globalFilter, () => {
  pagination.value.pageIndex = 0;
});

const { setPageState, clearPageState } = usePageStateStore();
definePageMeta({ layout: "default" });

const route = useRoute();
const toast = useToast();
const isSameTarget = (
  a: Pick<targetResponse, "channelId" | "type" | "enabled" | "guildId">,
  b: Pick<targetResponse, "channelId" | "type" | "enabled" | "guildId">,
) =>
  a.channelId === b.channelId &&
  a.type === b.type &&
  a.enabled === b.enabled &&
  a.guildId === b.guildId;
const serverId = Number(route.params?.["id"]);

const buildRequestFromRow = (row: targetResponse): targetSchemaRequestType =>
  targetSchemaRequest.parse({
    channelId: row.channelId.trim(),
    enabled: row.enabled,
    guildId: row.guildId?.trim(),
    type: row.type,
  });
const originalTargets = ref<targetResponse[] | null>(null);
let targetPlatform: null | PlatformType = null;
const formData = ref<targetResponse[] | null>(null);
const isDirty = computed(() => {
  if (!formData.value || !originalTargets.value) {
    return false;
  }

  return !isEqual(formData.value, originalTargets.value);
});
const loadingMap = reactive({
  isLoading: true,
  isSubmitting: false,
});

const isAnyLoading = computed(() => Object.values(loadingMap).some(Boolean));

const targetTypeOptions = [
  { label: "群聊", value: "group" },
  { label: "私聊", value: "private" },
];
const columnVisibility = computed(() => ({
  guildId: targetPlatform === PlatformType.Discord,
}));

const statusOptions = [
  { label: "已启用", value: true },
  { label: "已禁用", value: false },
];

const openDeleteModal = (id: string) => {
  targetToDelete.value = id;
  showDeleteModal.value = true;
};

const getRowchannelIdError = (index: number): string | undefined => {
  if (!formData.value) {
    return undefined;
  }
  const item = formData.value[index];
  if (!item) {
    return undefined;
  }
  const tid = item.channelId?.trim();
  if (!tid) {
    return "频道 ID 不能为空";
  }

  const isDup = formData.value.some(
    (t, i) => i !== index && t.channelId.trim() === tid && t.type === item.type,
  );
  if (isDup) {
    return "该组合已存在";
  }

  return undefined;
};

const getRowGuildIdError = (index: number): string | undefined => {
  if (!formData.value) {
    return undefined;
  }
  const item = formData.value[index];
  if (!item) {
    return undefined;
  }
  const gid = item.guildId?.trim();
  if (item.type === "group" && !gid) {
    return "群组 ID 不能为空";
  }
  return undefined;
};

const hasErrors = computed(() => {
  if (!formData.value) {
    return false;
  }

  return formData.value.some((_, idx) => !!getRowchannelIdError(idx) || !!getRowGuildIdError(idx));
});

const refreshAll = async (): Promise<void> => {
  if (!serverId) {
    loadingMap.isLoading = false;
    return;
  }
  loadingMap.isLoading = true;
  noBotConfigured.value = false;
  try {
    const serverData = await ServerData.get(serverId);
    if (!serverData.botId) {
      noBotConfigured.value = true;
      formData.value = null;
      originalTargets.value = null;
      return;
    }
    const targets = await TargetData.gets(serverId);
    const botData = await BotData.get(serverData.botId);
    targetPlatform = botData.platform;
    originalTargets.value = structuredClone(targets);
    formData.value = structuredClone(targets);
  } catch (error) {
    console.error(error);
    toast.add({ color: "error", title: "刷新目标列表失败" });
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
    await TargetData.deletes(serverId, { ids: [targetToDelete.value] });
    toast.add({ color: "success", title: "目标已删除" });
    await refreshAll();
  } catch (error) {
    console.error("删除失败：", error);
    toast.add({ color: "error", title: "删除失败，请稍后再试" });
  } finally {
    showDeleteModal.value = false;
    targetToDelete.value = null;
    loadingMap.isSubmitting = false;
  }
};


const columns: TableColumn<targetResponse>[] = [
  {
    accessorKey: "channelId",
    cell: ({row}) => {
      const errorMsg = getRowchannelIdError(row.index);
      return (
        <UFormField error={errorMsg}>
          <UInput
            color={errorMsg ? "error" : undefined}
            modelValue={row.original.channelId || ""}
            onUpdate:modelValue={(v: string) => {
              if (!formData.value) {
                return;
              }
              const item = formData.value[row.index];
              if (item) {
                item.channelId = String(v ?? "");
              }
            }}
            placeholder="请输入频道 ID"
          />
        </UFormField>
      );
    },
    header: "频道 ID",
  },
  {
    accessorKey: "guildId",
    cell: ({row}) => {
      const errorMsg = getRowGuildIdError(row.index);
      return (
        <UFormField error={errorMsg}>
          <UInput
            color={errorMsg ? "error" : undefined}
            modelValue={row.original.guildId || ""}
            onUpdate:modelValue={(v: string) => {
              if (!formData.value) {
                return;
              }
              const item = formData.value[row.index];
              if (item) {
                item.guildId = v ?? "";
              }
            }}
          />
        </UFormField>
      );
    },
    header: "群组 ID",
  },
  {
    accessorKey: "type",
    cell: ({row}) => (
      <USelect
        items={targetTypeOptions}
        modelValue={row.original.type}
        onUpdate:modelValue={(v: string) => {
          if (!formData.value) {
            return;
          }
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
        modelValue={row.original.enabled}
        onUpdate:modelValue={(v: boolean | undefined) => {
          if (!formData.value) {return;}
          const item = formData.value[row.index];
          if (item) {
            item.enabled = !!v;
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
  newTargetForm.channelId = "";
  newTargetForm.guildId = "";
  newTargetForm.type = "group";
  newTargetForm.enabled = true;
  showAddModal.value = true;
};

const handleAddTargetSubmit = async () => {
  if (!formData.value) {
    return;
  }
  const { type } = newTargetForm;

  const channelId = newTargetForm.channelId.trim();
  const guildId = (() => {
    if (columnVisibility.value.guildId) {
      return newTargetForm.guildId.trim();
    }
    if (type === "group") {
      return channelId; // 对于群聊类型，如果没有单独的 guildId 字段，则使用 channelId 作为 guildId
    }
  })();

  const isDuplicate = formData.value.some(
    (t) => t.channelId.trim() === channelId && t.type === type && t.guildId?.trim() === guildId
  );
  if (isDuplicate) {
    toast.add({
      color: "warning",
      title: `频道 ID 已经存在`,
    });
    return;
  }

  loadingMap.isSubmitting = true;
  try {
    const req = targetSchemaRequest.parse({
      channelId,
      enabled: newTargetForm.enabled,
      guildId,
      type,
    });

    await TargetData.creates(serverId, [req]);
    toast.add({ color: "success", title: "目标已添加" });
    showAddModal.value = false;
    await refreshAll();
  } catch (error) {
    console.error("添加失败：", error);
    toast.add({ color: "error", title: "添加失败，请稍后再试" });
  } finally {
    loadingMap.isSubmitting = false;
  }
};

const handleSubmit = async () => {
  if (!formData.value || !originalTargets.value) {
    return;
  }

  const originalById = keyBy(originalTargets.value, "id");
  const toUpdate = formData.value.filter((t) => {
    const ori = originalById[t.id];
    return (
      ori &&
      !isSameTarget(
        {
          channelId: t.channelId,
          enabled: t.enabled,
          guildId: t.guildId,
          type: t.type,
        },
        {
          channelId: ori.channelId,
          enabled: ori.enabled,
          guildId: ori.guildId,
          type: ori.type,
        },
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
  formData.value = originalTargets.value
    ? structuredClone(toRaw(originalTargets.value))
    : null;
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
