<template>
  <div class="flex flex-col h-full gap-3">
    <!-- head -->
    <div>
      <!-- text 区 -->
      <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <n-text class="flex flex-col gap-2" strong>
          <h1 class="text-2xl sm:text-3xl">玩家列表</h1>
          <p class="text-sm text-gray-400 sm:text-base">查看你的玩家，查看玩家的社交账号绑定情况及所在服务器。</p>
        </n-text>
        <div class="flex flex-wrap gap-2 sm:gap-3">
          <n-button size="large" strong>
            刷新列表
            <template #icon>
              <n-icon>
                <RefreshOutline />
              </n-icon>
            </template>
          </n-button>
        </div>
      </div>
    </div>
    <div>
      <div class="mb-4">
        <div class="grid grid-cols-1 gap-3 md:grid-cols-3">
          <n-input v-model:value="searchName" placeholder="搜索玩家名..." clearable></n-input>
          <n-input v-model:value="searchUUID" placeholder="搜索UUID..." clearable />
          <n-input v-model:value="searchIP" placeholder="搜索IP..." clearable />
        </div>
      </div>
      <n-data-table
        :data="data"
        :columns="columns"
        :pagination="{
          pageSizes: pageSizes,
          showSizePicker: true
        }"
      ></n-data-table>
    </div>
  </div>
</template>

<script setup lang="ts">
import { RefreshOutline } from "@vicons/ionicons5";
import { StatusCodes } from "http-status-codes";
import { NTag, NText } from "naive-ui";
import type { PlayerWithRelations } from "~~/shared/schemas/player";
import type { ApiResponse } from "~~/shared/types";
const message = useMessage();
const playerList = ref<PlayerWithRelations[]>([]);
const isLoadingList = ref(false);

async function fetchServerList() {
  try {
    isLoadingList.value = true;
    const response = await $fetch<ApiResponse<PlayerWithRelations[]>>("/api/players");
    if (response.code === StatusCodes.OK && response.data) {
      playerList.value = response.data;
    } else {
      message.error("获取服务器列表失败");
    }
  } catch (error) {
    console.error("Failed to fetch server list:", error);
    message.error("获取服务器列表失败");
  } finally {
    isLoadingList.value = false;
  }
}

onMounted(() => {
  fetchServerList();
});

const searchName = ref("");
const searchUUID = ref("");
const searchIP = ref("");

const data = computed(() =>
  playerList.value
    .map((player) => ({
      name: player.player.name,
      uuid: player.player.uuid,
      ip: player.player.ip,
      socialAccount: player.socialAccount,
      server: player.servers.map((server) => server.name).join(", ")
    }))
    .filter((player) => {
      return (
        player.name.toLowerCase().includes(searchName.value.toLowerCase()) &&
        player.uuid.toLowerCase().includes(searchUUID.value.toLowerCase()) &&
        player.ip &&
        player.ip.toLowerCase().includes(searchIP.value.toLowerCase())
      );
    })
);

const pageSizes = [
  {
    label: "10 每页",
    value: 10
  },
  {
    label: "20 每页",
    value: 20
  },
  {
    label: "30 每页",
    value: 30
  },
  {
    label: "40 每页",
    value: 40
  }
];

const columns = [
  {
    title: "玩家名",
    key: "name",
    width: "10%"
  },
  {
    title: "UUID",
    key: "uuid",
    width: "20%"
  },
  {
    title: "IP 地址",
    key: "ip",
    width: "10%"
  },
  {
    title: "社交账号",
    key: "socialAccount",
    width: "20%",
    render(row: PlayerWithRelations) {
      return [
        h(
          NTag,
          {
            type: "info",
            size: "small"
          },
          {
            default: () => (row.socialAccount ? `${row.socialAccount.adapterType}` : undefined)
          }
        ),
        h(NText, null, {
          default: () => {
            if (row.socialAccount && row.socialAccount.nickname) {
              return ` ${row.socialAccount.nickname} (${row.socialAccount.uid})`;
            } else {
              return "未绑定";
            }
          }
        })
      ];
    }
  },
  {
    title: "所在服务器",
    key: "server",
    width: "10%"
  }
];
</script>
