import { StatusCodes } from "http-status-codes";
import { getDatabase } from "~~/server/db/client";
import { adapters } from "~~/server/db/schema";
import { chatBridge } from "~~/server/service/chatbridge/chatbridge";
import { ApiError, createErrorResponse } from "~~/shared/error";
import type { AdapterWithStatus } from "~~/shared/schemas/adapter";
import { createApiResponse } from "~~/shared/types";

export default defineEventHandler(async (event) => {
    try {
        const database = await getDatabase();
        const result = await database.select().from(adapters);

        const adaptersWithStatus: AdapterWithStatus[] = result.map((adapter) => {
            let isOnline = false;
            if (!chatBridge.getConnectionData(adapter.id)) {
                isOnline = false;
            } else {
                isOnline = chatBridge.isOnline(adapter.id);
            }
            return {
                ...adapter,
                isOnline
            };
        });

        return createApiResponse(event, "获取适配器列表成功", StatusCodes.OK, adaptersWithStatus);
    } catch (err) {
        console.error("Database error:", err);
        return createErrorResponse(event, ApiError.database("获取适配器列表失败"));
    }
});
