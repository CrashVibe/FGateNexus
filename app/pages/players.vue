<template>
  <div class="flex h-full flex-col gap-3">
    <!-- head -->
    <div>
      <PageHeader
        title="玩家列表"
        description="查看你的玩家，查看玩家的社交账号绑定情况及所在服务器。"
      >
        <div class="flex flex-wrap gap-2 sm:gap-3">
          <n-button
            size="large"
            strong
            :loading="isLoadingList"
            @click="fetchServerList"
          >
            刷新列表
            <template #icon>
              <n-icon>
                <RefreshOutline />
              </n-icon>
            </template>
          </n-button>
        </div>
      </PageHeader>
    </div>
    <div>
      <div class="mb-4">
        <div class="grid grid-cols-1 gap-3 md:grid-cols-4">
          <n-input
            v-model:value="searchName"
            clearable
            placeholder="搜索玩家名..."
          ></n-input>
          <n-input
            v-model:value="searchUUID"
            clearable
            placeholder="搜索UUID..."
          />
          <n-input v-model:value="searchIP" clearable placeholder="搜索IP..." />
          <n-input
            v-model:value="searchSocial"
            clearable
            placeholder="搜索社交账号UID..."
          />
        </div>
      </div>
      <n-data-table
        :columns="columns"
        :data="data"
        :pagination="{
          pageSizes: pageSizes,
          showSizePicker: true,
        }"
        :scroll-x="600"
      ></n-data-table>
    </div>
  </div>
</template>

<script lang="tsx" setup>
import { RefreshOutline } from "@vicons/ionicons5";
import { NTag, NText } from "naive-ui";
import type { z } from "zod";
import { PlayerData } from "~/composables/api";
import type { PlayerAPI } from "~~/shared/schemas/player";
import PageHeader from "@/components/header/page-header.vue";

const message = useMessage();
const playerList = ref<z.infer<typeof PlayerAPI.GETS.response>>([]);
const isLoadingList = ref(false);

const fetchServerList = async () => {
  isLoadingList.value = true;
  try {
    const data = await PlayerData.gets();
    playerList.value = data;
  } catch (error) {
    console.error("Failed to fetch server list:", error);
    message.error("获取服务器列表失败");
  } finally {
    isLoadingList.value = false;
  }
};

onMounted(() => {
  fetchServerList();
});

const searchName = ref("");
const searchUUID = ref("");
const searchIP = ref("");
const searchSocial = ref("");

const data = computed(() =>
  playerList.value
    .map((player) => ({
      ip: player.player.ip,
      name: player.player.name,
      serversName: player.serversName.join(", "),
      socialAccount: player.socialAccount,
      uuid: player.player.uuid,
    }))
    .filter((player) => (
        player.name.toLowerCase().includes(searchName.value.toLowerCase()) &&
        player.uuid.toLowerCase().includes(searchUUID.value.toLowerCase()) &&
        (player.ip ?? "")
          .toLowerCase()
          .includes(searchIP.value.toLowerCase()) &&
        (player.socialAccount?.uid ?? "")
          .toLowerCase()
          .includes(searchSocial.value.toLowerCase())
      )),
);

const pageSizes = [
  {
    label: "10 每页",
    value: 10,
  },
  {
    label: "20 每页",
    value: 20,
  },
  {
    label: "30 每页",
    value: 30,
  },
  {
    label: "40 每页",
    value: 40,
  },
];

const columns = [
  {
    key: "name",
    title: "玩家名",
    width: "10%",
  },
  {
    key: "uuid",
    title: "UUID",
    width: "20%",
  },
  {
    key: "ip",
    title: "IP 地址",
    width: "10%",
  },
  {
    key: "socialAccount",
    render(row: z.infer<typeof PlayerAPI.GETS.response.element>) {
      return row.socialAccount ? (
        <>
          <NTag type="info" size="small">
            {row.socialAccount.adapterType}
          </NTag>
          <NText
            depth={3}
          >{` ${row.socialAccount.nickname} (${row.socialAccount.uid})`}</NText>
        </>
      ) : (
        <NTag type="error" size="small">
          未绑定
        </NTag>
      );
    },
    title: "社交账号",
    width: "20%",
  },
  {
    key: "serversName",
    title: "所在服务器",
    width: "10%",
  },
];
</script>
