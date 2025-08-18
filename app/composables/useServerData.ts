import { computed, ref } from "vue";
import { useRoute } from "vue-router";
import { useMessage } from "naive-ui";
import type { ApiResponse } from "~~/shared/types";
import type { ServerWithStatus } from "~~/shared/schemas/server/servers";
import { StatusCodes } from "http-status-codes";

export const getServerData = computed(() => {
    const route = useRoute();
    const message = useMessage();
    const isLoading = ref(true);
    const serverId = computed(() => Number(route.params?.["id"]));
    const serverData = ref<ServerWithStatus>();

    $fetch<ApiResponse<ServerWithStatus>>("/api/servers/" + serverId.value)
        .then((response) => {
            if (response.code === StatusCodes.OK && response.data) {
                serverData.value = response.data;
            } else {
                message.error("获取服务器列表失败");
                throw new Error("获取服务器列表失败");
            }
        })
        .catch(() => {
            message.error("获取服务器列表失败");
            throw new Error("获取服务器列表失败");
        });
    isLoading.value = false;
    return { serverData, isLoading };
});
