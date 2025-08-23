import { computed } from "vue";
import { useRoute } from "vue-router";
import { useMessage } from "naive-ui";
import type { ApiResponse } from "~~/shared/types";
import type { ServerWithStatus } from "~~/shared/schemas/server/servers";
import { StatusCodes } from "http-status-codes";

export async function getServerData() {
    const route = useRoute();
    const message = useMessage();
    const serverId = computed(() => Number(route.params?.["id"]));
    try {
        const response = await $fetch<ApiResponse<ServerWithStatus>>("/api/servers/" + serverId.value);
        if (response.code === StatusCodes.OK && response.data) {
            return response.data;
        } else {
            message.error("获取服务器失败");
            throw new Error("获取服务器失败");
        }
    } catch {
        message.error("获取服务器失败");
        throw new Error("获取服务器失败");
    }
}
