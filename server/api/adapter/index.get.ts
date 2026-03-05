import { StatusCodes } from "http-status-codes";
import type { z } from "zod";
import { db } from "~~/server/db/client";
import { adapters } from "~~/server/db/schema";
import { chatBridge } from "~~/server/service/chatbridge";
import { ApiError, createErrorResponse } from "~~/shared/error";
import { AdapterAPI } from "~~/shared/schemas/adapter";
import { createApiResponse } from "~~/shared/types";

export default defineEventHandler(async (event) => {
  try {
    const result = await db.select().from(adapters);

    const adaptersWithStatus: z.infer<typeof AdapterAPI.GETS.response> =
      result.map((adapter) => {
        const isOnline = chatBridge.getConnectionData(adapter.id)
          ? chatBridge.isOnline(adapter.id)
          : false;
        return {
          ...adapter,
          isOnline,
        };
      });

    return createApiResponse(
      event,
      "获取适配器列表成功",
      StatusCodes.OK,
      AdapterAPI.GETS.response.parse(adaptersWithStatus),
    );
  } catch (error) {
    logger.error({ error }, "获取适配器列表失败");
    return createErrorResponse(event, ApiError.database("获取适配器列表失败"));
  }
});
