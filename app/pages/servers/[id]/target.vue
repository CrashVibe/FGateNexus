<template>
  <div>
    <HeaderServer class="mb-3" />

    <n-card size="small" title="目标配置">
      <template #header-extra>
        <n-button size="small" type="primary" @click="addTarget">添加目标</n-button>
      </template>
      <n-data-table
        :columns="columns"
        :data="data"
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
      <n-button :disabled="isAnyLoading || !isDirty" :loading="isAnyLoading" @click="cancelChanges">取消更改</n-button>
      <n-button :disabled="isAnyLoading || !isDirty" :loading="isAnyLoading" ghost type="primary" @click="handleSubmit">
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
// ==================== 导入 ====================
import { StatusCodes } from "http-status-codes";
import { NButton, NInput, NSelect } from "naive-ui";
import { v4 as uuidv4 } from "uuid";
import type { targetSchema, targetSchemaRequestType } from "~~/shared/schemas/server/target";
import type { ApiResponse } from "~~/shared/types";
const { setPageState, clearPageState } = usePageStateStore();

// ==================== 页面配置 ====================
definePageMeta({ layout: "server-edit" });

// ==================== 依赖注入 & 工具 ====================
const route = useRoute();
const message = useMessage();

// ==================== 工具函数 ====================
const deepClone = <T,>(v: T): T => JSON.parse(JSON.stringify(v));
const isSameTarget = (
  a: Pick<targetSchema, "targetId" | "type" | "enabled">,
  b: Pick<targetSchema, "targetId" | "type" | "enabled">
) => a.targetId === b.targetId && a.type === b.type && a.enabled === b.enabled;

function buildRequestFromRow(row: targetSchema): targetSchemaRequestType {
  return {
    targetId: (row.targetId || "").trim(),
    type: row.type,
    enabled: !!row.enabled
  };
}

function getDefaultTarget(): targetSchema {
  // 本地临时行（id 以 temp- 开头），提交创建后会用后端返回替换
  return {
    id: `temp-${uuidv4()}`,
    serverId: Number(route.params?.["id"] ?? 0),
    targetId: "",
    type: "group",
    enabled: true,
    config: {
      CommandConfigSchema: { enabled: false, permissions: [], prefix: "/" },
      chatSyncConfigSchema: { enabled: false },
      NotifyConfigSchema: { enabled: false }
    },
    createdAt: new Date(),
    updatedAt: new Date()
  };
}

// ==================== 计算属性 ====================
const data = computed(() => formData.value);

const isDirty = computed(
  () =>
    dataState.isSubmitting ||
    (!dataState.isLoading && JSON.stringify(formData.value) !== JSON.stringify(dataState.originalTargets))
);
const isAnyLoading = computed(() => dataState.isLoading);

// ==================== 类型定义与状态 ====================
interface DataState {
  isLoading: boolean;
  isSubmitting: boolean;
  originalTargets: targetSchema[];
}
const dataState = reactive<DataState>({
  isLoading: true,
  isSubmitting: false,
  originalTargets: []
});

const formData = ref<targetSchema[]>([]);

// ==================== 选项 ====================
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

// ==================== 表格列 ====================
const columns = [
  {
    title: "目标ID",
    key: "targetId",
    width: "40%",
    render(row: targetSchema, index: number) {
      return h(NInput, {
        placeholder: "请输入目标ID",
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
    render(row: targetSchema, index: number) {
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
    render(row: targetSchema, index: number) {
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
    render(row: targetSchema) {
      const id = row.id;
      return (
        <NButton size="small" onClick={() => id && removeTargetById(id)}>
          删除
        </NButton>
      );
    }
  }
];

// ==================== 目标管理 ====================
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

// ==================== 数据管理类 ====================
class DataManager {
  serverId = Number(route.params?.["id"]);
  get baseUrl() {
    return `/api/servers/${this.serverId}/targets`;
  }

  async fetchTargets(): Promise<targetSchema[]> {
    const res = await $fetch<ApiResponse<targetSchema[]>>(this.baseUrl);
    if (res.code !== StatusCodes.OK) throw new Error(res.message || "获取目标失败");
    return res.data ?? [];
  }

  async createTargets(payloads: targetSchemaRequestType[]): Promise<targetSchema[]> {
    if (!payloads.length) return [];
    const res = await $fetch<ApiResponse<targetSchema[]>>(this.baseUrl, {
      method: "POST",
      body: payloads
    });
    if (![StatusCodes.OK, StatusCodes.CREATED].includes(res.code)) {
      throw new Error(res.message || "批量创建目标失败");
    }
    return res.data ?? [];
  }

  async updateTargets(items: { id: string; data: targetSchemaRequestType }[]): Promise<void> {
    if (!items.length) return;
    const res = await $fetch<ApiResponse<targetSchema[]>>(this.baseUrl, {
      method: "PATCH",
      body: { items }
    });
    if (res.code !== StatusCodes.OK) throw new Error(res.message || "批量更新目标失败");
  }

  async deleteTargets(ids: string[]): Promise<void> {
    if (!ids.length) return;
    const res = await $fetch<ApiResponse<targetSchema[]>>(this.baseUrl, {
      method: "DELETE",
      body: { ids }
    });
    if (res.code !== StatusCodes.OK) throw new Error(res.message || "批量删除目标失败");
  }

  async refreshAll(): Promise<void> {
    if (!this.serverId) return;
    dataState.isLoading = true;
    try {
      const targets = await this.fetchTargets();
      dataState.originalTargets = deepClone(targets);
      formData.value = deepClone(targets);
    } catch (e) {
      console.error(e);
      message.error("刷新目标列表失败");
    } finally {
      dataState.isLoading = false;
    }
  }
}

const dataManager = new DataManager();

// ==================== 事件处理：保存 ====================
async function handleSubmit() {
  if (!dataManager.serverId) {
    message.error("服务器 ID 无效");
    return;
  }

  // 1) 组合唯一性校验
  const combo = new Map<string, number[]>();
  formData.value.forEach((t, i) => {
    const key = `${(t.targetId || "").trim()}::${t.type}`;
    const arr = combo.get(key) ?? [];
    arr.push(i);
    combo.set(key, arr);
  });
  const dup = [...combo.entries()].filter(([, idxs]) => idxs.length > 1);
  if (dup.length) {
    const msg = dup
      .map(([key, idxs]) => {
        const [tid, tp] = key.split("::");
        return `目标ID "${tid}" + 类型 "${tp === "group" ? "群聊" : "私聊"}" 重复 ${idxs.length} 次`;
      })
      .join("； ");
    message.warning(`发现重复目标配置：${msg}`);
    return;
  }

  // 2) 差异对比
  const originalById = new Map(dataState.originalTargets.map((t) => [t.id, t]));
  const currentById = new Map(formData.value.map((t) => [t.id, t]));

  const toCreate = formData.value.filter((t) => t.id.startsWith("temp-"));
  const toDelete = dataState.originalTargets.filter((t) => !currentById.has(t.id));
  const toUpdate = formData.value
    .filter((t) => !t.id.startsWith("temp-") && originalById.has(t.id))
    .filter((t) => {
      const ori = originalById.get(t.id)!;
      return !isSameTarget(
        { targetId: t.targetId, type: t.type, enabled: t.enabled },
        { targetId: ori.targetId, type: ori.type, enabled: ori.enabled }
      );
    });

  if (!toCreate.length && !toUpdate.length && !toDelete.length) {
    message.info("没有需要保存的更改");
    return;
  }

  // 3) 提交
  dataState.isSubmitting = true;
  try {
    // 3.1 批量创建
    const created = await dataManager.createTargets(toCreate.map((row) => buildRequestFromRow(row)));

    // 用后端返回替换本地临时行（按 targetId+type 匹配）
    for (const c of created) {
      const idx = formData.value.findIndex(
        (r) => r.id.startsWith("temp-") && r.targetId === c.targetId && r.type === c.type
      );
      if (idx !== -1) formData.value[idx] = c;
    }

    // 3.2 更新
    await dataManager.updateTargets(
      toUpdate.map((row) => ({
        id: row.id,
        data: buildRequestFromRow(row)
      }))
    );

    // 3.3 删除
    await dataManager.deleteTargets(toDelete.map((r) => r.id));

    await dataManager.refreshAll();
    message.success("目标配置已保存");
  } catch (err) {
    console.error("保存失败：", err);
    message.error("保存失败，请稍后重试");
  } finally {
    dataState.isSubmitting = false;
  }
}

function cancelChanges() {
  formData.value = deepClone(dataState.originalTargets ?? []);
}

// ==================== 生命周期 ====================
onMounted(async () => {
  await dataManager.refreshAll();
  setPageState({
    isDirty: () => isDirty.value,
    save: handleSubmit
  });
});

onUnmounted(() => {
  clearPageState();
});
</script>
