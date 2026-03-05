<template>
  <div>
    <ServerHeader class="mb-3" />

    <n-card size="small" title="目标配置">
      <template #header-extra>
        <n-button size="small" type="primary" @click="addTarget"
          >添加目标</n-button
        >
      </template>
      <n-data-table
        :columns="columns"
        :data="formData"
        :pagination="{
          pageSizes: pageSizes,
          showSizePicker: true,
        }"
        :scroll-x="600"
      >
        <template #empty>
          <n-empty description="暂无目标配置，请添加目标">
            <template #extra>
              <n-button size="medium" type="primary" @click="addTarget"
                >添加目标</n-button
              >
            </template>
          </n-empty>
        </template>
      </n-data-table>
    </n-card>

    <!-- 操作按钮区 -->
    <n-divider />
    <div class="flex justify-end gap-2">
      <n-button
        :disabled="!isDirty"
        :loading="isAnyLoading"
        @click="cancelChanges"
        >取消更改</n-button
      >
      <n-button
        :disabled="!isDirty"
        :loading="isAnyLoading"
        ghost
        type="primary"
        @click="handleSubmit"
      >
        <template #icon>
          <n-icon>
            <svg viewBox="0 0 24 24">
              <path
                d="M17 3H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V7l-4-4zm2 16H5V5h11.17L19 7.83V19zm-7-7c-1.66 0-3 1.34-3 3s1.34 3 3 3s3-1.34 3-3s-1.34-3-3-3zM6 6h9v4H6z"
                fill="currentColor"
              />
            </svg>
          </n-icon>
        </template>
        保存配置
      </n-button>
    </div>
  </div>
</template>

<script lang="tsx" setup>
import { NButton, NInput, NSelect } from "naive-ui";
import { v4 as uuidv4 } from "uuid";
import { targetSchema, targetSchemaRequest } from '~~/shared/schemas/server/target';
import type { targetResponse, targetSchemaRequestType } from '~~/shared/schemas/server/target';
import { groupBy,isEqual, keyBy } from "lodash-es";
import { TargetData } from "~/composables/api";
import { z } from "zod";
import ServerHeader from "@/components/header/server-header.vue";

const { setPageState, clearPageState } = usePageStateStore();
definePageMeta({ layout: "default" });

const route = useRoute();
const message = useMessage();
const isSameTarget = (
  a: Pick<targetResponse, "targetId" | "type" | "enabled">,
  b: Pick<targetResponse, "targetId" | "type" | "enabled">,
) => a.targetId === b.targetId && a.type === b.type && a.enabled === b.enabled;
const serverId = Number(route.params?.["id"]);

const buildRequestFromRow = (row: targetResponse): targetSchemaRequestType => targetSchemaRequest.parse({
    config: row.config,
    enabled: !!row.enabled,
    targetId: row.targetId.trim(),
    type: row.type,
  });

const getDefaultTarget = (): targetResponse => targetSchema.extend({ targetId: z.string().default("") }).parse({
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

const statusFilterOptions = [
  { label: "已启用", value: "enable" },
  { label: "已禁用", value: "disable" },
];

const pageSizes = [
  { label: "10 每页", value: 10 },
  { label: "20 每页", value: 20 },
  { label: "30 每页", value: 30 },
  { label: "40 每页", value: 40 },
];

const removeTargetById = (id: string) => {
  const idx = formData.value.findIndex((t) => t.id === id);
  if (idx !== -1) {formData.value.splice(idx, 1);}
};

const columns = [
  {
    key: "targetId",
    render(row: targetResponse, index: number) {
      return h(NInput, {
        onUpdateValue(v) {
          if (formData.value[index]) {formData.value[index].targetId = v;}
        },
        placeholder: "请输入目标 ID",
        value: row.targetId,
      });
    },
    title: "目标 ID",
    width: "40%",
  },
  {
    key: "type",
    render(row: targetResponse, index: number) {
      return h(NSelect, {
        onUpdateValue(v) {
          if (formData.value[index]) {formData.value[index].type = v;}
        },
        options: targetTypeOptions,
        value: row.type,
      });
    },
    title: "类型",
    width: "20%",
  },
  {
    key: "enabled",
    render(row: targetResponse, index: number) {
      return h(NSelect, {
        onUpdateValue(v: string) {
          if (formData.value[index])
            {formData.value[index].enabled = v === "enable";}
        },
        options: statusFilterOptions,
        value: row.enabled ? "enable" : "disable",
      });
    },
    title: "状态",
    width: "20%",
  },
  {
    key: "actions",
    render(row: targetResponse) {
      const {id} = row;
      return (
        <NButton size="small" onClick={() => id && removeTargetById(id)}>
          删除
        </NButton>
      );
    },
    title: "操作",
  },
];

const addTarget = () => {
  const list = formData.value;
  if (list.length > 0 && !list.at(-1)?.targetId?.trim()) {
    message.warning("请先把上一行的目标 ID 填完哦~");
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
    message.error("刷新目标列表失败");
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
        if (firstItem === undefined) { return null; }
        const { targetId, type } = firstItem;
        return `目标 ID "${targetId.trim()}" + 类型 "${type === "group" ? "群聊" : "私聊"}" 出现 ${items.length} 次`;
      })
      .filter(Boolean)
      .join("； ");
    message.warning(`发现重复目标配置：${msg}`);
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
    message.info("没有需要保存的更改");
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
    message.success("配置已保存");
  } catch (error) {
    console.error("保存失败：", error);
    message.error("保存配置失败，请稍后再试");
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
