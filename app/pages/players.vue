<script lang="ts" setup>
import type { TableColumn } from "@nuxt/ui";
import { getPaginationRowModel } from "@tanstack/vue-table";
import type { z } from "zod";
import type { PlayerAPI } from "~~/shared/schemas/player";

import PageHeader from "@/components/header/page-header.vue";
import { PlayerData } from "~/composables/api";

const UBadge = resolveComponent("UBadge");

const toast = useToast();
const playerList = ref<z.infer<typeof PlayerAPI.GETS.response>>([]);
const isLoadingList = ref(false);

const fetchPlayerList = async () => {
  isLoadingList.value = true;
  try {
    playerList.value = await PlayerData.gets();
  } catch (error) {
    console.error("Failed to fetch player list:", error);
    toast.add({ color: "error", title: "获取玩家列表失败" });
  } finally {
    isLoadingList.value = false;
  }
};

onMounted(() => {
  fetchPlayerList();
});

const searchName = ref("");
const searchUUID = ref("");
const searchIP = ref("");
const searchSocial = ref("");

interface PlayerRow {
  ip: string | null;
  name: string;
  serversName: string;
  socialAccount: z.infer<
    typeof PlayerAPI.GETS.response
  >[number]["socialAccount"];
  uuid: string;
}

const table = useTemplateRef("table");
const pagination = ref({ pageIndex: 0, pageSize: 10 });

watch([searchName, searchUUID, searchIP, searchSocial], () => {
  pagination.value.pageIndex = 0;
});

const data = computed<PlayerRow[]>(() =>
  playerList.value
    .map((player) => ({
      ip: player.player.ip,
      name: player.player.name,
      serversName: player.serversName.join(", "),
      socialAccount: player.socialAccount,
      uuid: player.player.uuid,
    }))
    .filter(
      (player) =>
        player.name.toLowerCase().includes(searchName.value.toLowerCase()) &&
        player.uuid.toLowerCase().includes(searchUUID.value.toLowerCase()) &&
        (player.ip ?? "")
          .toLowerCase()
          .includes(searchIP.value.toLowerCase()) &&
        (player.socialAccount?.uid ?? "")
          .toLowerCase()
          .includes(searchSocial.value.toLowerCase()),
    ),
);

const columns: TableColumn<PlayerRow>[] = [
  {
    accessorKey: "name",
    header: "玩家名",
  },
  {
    accessorKey: "uuid",
    header: "UUID",
  },
  {
    accessorKey: "ip",
    cell: ({ row }) => row.original.ip ?? "—",
    header: "IP 地址",
  },
  {
    accessorKey: "socialAccount",
    cell: ({ row }) => {
      const sa = row.original.socialAccount;
      if (sa) {
        return h("div", { class: "flex items-center gap-2" }, [
          h(
            UBadge,
            { color: "info", size: "sm", variant: "subtle" },
            () => sa.adapterType,
          ),
          h(
            "span",
            { class: "text-muted text-sm" },
            `${sa.nickname ?? ""} (${sa.uid})`,
          ),
        ]);
      }
      return h(
        UBadge,
        { color: "error", size: "sm", variant: "subtle" },
        () => "未绑定",
      );
    },
    header: "社交账号",
  },
  {
    accessorKey: "serversName",
    cell: ({ row }) => row.original.serversName || "—",
    header: "所在服务器",
  },
];
</script>

<template>
  <div class="h-full">
    <UDashboardPanel
      class="scrollbar-custom h-full"
      :ui="{ body: 'p-0 sm:p-0 overflow-y-auto overscroll-none' }"
    >
      <template #header>
        <PageHeader
          title="玩家列表"
          description="查看你的玩家，查看玩家的社交账号绑定情况及所在服务器。"
        />
      </template>
      <template #body>
        <UContainer class="py-8">
          <!-- 搜索栏 -->
          <div class="mb-4 grid grid-cols-1 gap-3 md:grid-cols-4">
            <UInput
              v-model="searchName"
              icon="i-lucide-search"
              placeholder="搜索玩家名..."
            />
            <UInput
              v-model="searchUUID"
              icon="i-lucide-search"
              placeholder="搜索UUID..."
            />
            <UInput
              v-model="searchIP"
              icon="i-lucide-search"
              placeholder="搜索IP..."
            />
            <UInput
              v-model="searchSocial"
              icon="i-lucide-search"
              placeholder="搜索社交账号UID..."
            />
          </div>

          <!-- 表格 -->
          <UTable
            ref="table"
            v-model:pagination="pagination"
            :data="data"
            :columns="columns"
            :loading="isLoadingList"
            :pagination-options="{
              getPaginationRowModel: getPaginationRowModel(),
            }"
          >
            <template #empty>
              <div class="text-muted py-8 text-center text-sm">
                暂无玩家数据
              </div>
            </template>
          </UTable>

          <!-- 分页 -->
          <div class="border-default mt-4 flex justify-end border-t px-4 pt-4">
            <UPagination
              :page="
                (table?.tableApi?.getState().pagination.pageIndex || 0) + 1
              "
              :items-per-page="table?.tableApi?.getState().pagination.pageSize"
              :total="table?.tableApi?.getFilteredRowModel().rows.length"
              @update:page="(p) => table?.tableApi?.setPageIndex(p - 1)"
            />
          </div>
        </UContainer>
      </template>
    </UDashboardPanel>
  </div>
</template>
