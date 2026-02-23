<template>
  <div>
    <HeaderServer class="mb-3" />

    <n-card size="small" title="目标配置">
      <template #header-extra>
        <n-button size="small" type="primary" @click="addTarget">添加目标</n-button>
      </template>
      <n-data-table
        :columns="columns"
        :data="formData"
        :pagination="{
          pageSizes: pageSizes,
          showSizePicker: true
        }"
        :scroll-x="600"
      >
        <template #empty>
          <n-empty description="暂无目标配置，请添加目标">
            <template #extra>
              <n-button size="medium" type="primary" @click="addTarget">添加目标</n-button>
            </template>
          </n-empty>
        </template>
      </n-data-table>
    </n-card>

    <!-- 操作按钮区 -->
    <n-divider />
    <div class="flex justify-end gap-2">
      <n-button :disabled="!isDirty" :loading="isAnyLoading" @click="cancelChanges">取消更改</n-button>
      <n-button :disabled="!isDirty" :loading="isAnyLoading" ghost type="primary" @click="handleSubmit">
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
import {
  targetSchema,
  targetSchemaRequest,
  type targetResponse,
  type targetSchemaRequestType
} from "~~/shared/schemas/server/target";
import { cloneDeep, groupBy, isEqual, keyBy } from "lodash-es";
import { TargetData } from "~/composables/api";
import z from "zod";

const { setPageState, clearPageState } = usePageStateStore();
definePageMeta({ layout: "default" });

const route = useRoute();
const message = useMessage();
const isSameTarget = (
  a: Pick<targetResponse, "targetId" | "type" | "enabled">,
  b: Pick<targetResponse, "targetId" | "type" | "enabled">
) => a.targetId === b.targetId && a.type === b.type && a.enabled === b.enabled;
const serverId = Number(route.params?.["id"]);

function buildRequestFromRow(row: targetResponse): targetSchemaRequestType {
  return targetSchemaRequest.parse({
    targetId: row.targetId.trim(),
    type: row.type,
    enabled: !!row.enabled,
    config: row.config
  });
}

function getDefaultTarget(): targetResponse {
  return targetSchema.extend({ targetId: z.string().default("") }).parse({
    id: `temp-${uuidv4()}`
  });
}

const isDirty = computed(() => !isEqual(formData.value, originalTargets));
const loadingMap = reactive({
  isLoading: true,
  isSubmitting: false
});

const isAnyLoading = computed(() => Object.values(loadingMap).some(Boolean));

let originalTargets: targetResponse[] = [];

const formData = ref<targetResponse[]>([]);

const targetTypeOptions = [
  { label: "群聊", value: "group" },
  { label: "私聊", value: "private" }
];

const statusFilterOptions = [
  { label: "已启用", value: "enable" },
  { label: "已禁用", value: "disable" }
];

const pageSizes = [
  { label: "10 每页", value: 10 },
  { label: "20 每页", value: 20 },
  { label: "30 每页", value: 30 },
  { label: "40 每页", value: 40 }
];

const columns = [
  {
    title: "目标 ID",
    key: "targetId",
    width: "40%",
    render(row: targetResponse, index: number) {
      return h(NInput, {
        placeholder: "请输入目标 ID",
        value: row.targetId,
        onUpdateValue(v) {
          if (formData.value[index]) formData.value[index].targetId = v;
        }
      });
    }
  },
  {
    title: "类型",
    key: "type",
    width: "20%",
    render(row: targetResponse, index: number) {
      return h(NSelect, {
        value: row.type,
        options: targetTypeOptions,
        onUpdateValue(v) {
          if (formData.value[index]) formData.value[index].type = v;
        }
      });
    }
  },
  {
    title: "状态",
    key: "enabled",
    width: "20%",
    render(row: targetResponse, index: number) {
      return h(NSelect, {
        value: row.enabled ? "enable" : "disable",
        options: statusFilterOptions,
        onUpdateValue(v: string) {
          if (formData.value[index]) formData.value[index].enabled = v === "enable";
        }
      });
    }
  },
  {
    title: "操作",
    key: "actions",
    render(row: targetResponse) {
      const id = row.id;
      return (
        <NButton size="small" onClick={() => id && removeTargetById(id)}>
          删除
        </NButton>
      );
    }
  }
];

function addTarget() {
  const list = formData.value;
  if (list.length > 0 && !list[list.length - 1]?.targetId?.trim()) {
    message.warning("请先把上一行的目标 ID 填完哦~");
    return;
  }
  formData.value.push(getDefaultTarget());
}

function removeTargetById(id: string) {
  const idx = formData.value.findIndex((t) => t.id === id);
  if (idx !== -1) formData.value.splice(idx, 1);
}

async function refreshAll(): Promise<void> {
  loadingMap.isLoading = true;
  try {
    const targets = await TargetData.gets(serverId);
    originalTargets = cloneDeep(targets);
    formData.value = cloneDeep(targets);
  } catch (e) {
    console.error(e);
    message.error("刷新目标列表失败");
  } finally {
    loadingMap.isLoading = false;
  }
}

async function handleSubmit() {
  // 1) 组合唯一性校验
  const keyToItems = groupBy(formData.value, (t) => `${t.targetId.trim()}::${t.type}`);
  const dup = Object.entries(keyToItems).filter(([, items]) => items.length > 1);
  if (dup.length) {
    const msg = dup
      .map(([, items]) => {
        if (!items[0]) return undefined;
        const { targetId, type } = items[0];
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
        { targetId: t.targetId, type: t.type, enabled: t.enabled },
        { targetId: ori.targetId, type: ori.type, enabled: ori.enabled }
      )
    );
  });

  if ((!toCreate.length && !toUpdate.length && !toDelete.length) || !isDirty.value) {
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
        toCreate.map((row) => buildRequestFromRow(row))
      );
    }

    // 3.2 更新
    if (toUpdate.length > 0) {
      await TargetData.updates(serverId, {
        items: toUpdate.map((row) => ({
          id: row.id,
          data: buildRequestFromRow(row)
        }))
      });
    }

    // 3.3 删除
    if (toDelete.length > 0) {
      await TargetData.deletes(serverId, { ids: toDelete.map((r) => r.id) });
    }

    await refreshAll();
    message.success("配置已保存");
  } catch (err) {
    console.error("保存失败：", err);
    message.error("保存配置失败，请稍后再试");
  } finally {
    loadingMap.isSubmitting = false;
  }
}

function cancelChanges() {
  formData.value = cloneDeep(originalTargets);
}

onMounted(async () => {
  await refreshAll();
  setPageState({
    isDirty: () => isDirty.value,
    save: handleSubmit
  });
});

onUnmounted(() => {
  clearPageState();
});
</script>
