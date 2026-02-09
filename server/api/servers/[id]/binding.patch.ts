import { ApiError, createErrorResponse } from "#shared/error";
import { createApiResponse } from "#shared/types";
import { eq } from "drizzle-orm";
import { defineEventHandler, readBody } from "h3";
import { StatusCodes } from "http-status-codes";
import { getDatabase } from "~~/server/db/client";
import { servers } from "~~/server/db/schema";
import { BindingConfigSchema } from "~~/shared/schemas/server/binding";

export default defineEventHandler(async (event) => {
  try {
    const serverID = Number(getRouterParam(event, "id"));

    if (isNaN(serverID)) {
      const apiError = ApiError.validation("参数错误：无效的服务器 ID");
      return createErrorResponse(event, apiError);
    }

    const parsed = BindingConfigSchema.safeParse(await readBody(event));

    if (!parsed.success) {
      const apiError = ApiError.validation("参数错误");
      return createErrorResponse(event, apiError, parsed.error);
    }

    const database = await getDatabase();
    const result = await database
      .update(servers)
      .set({
        bindingConfig: parsed.data
      })
      .where(eq(servers.id, serverID))
      .returning();

    if (!result[0]) {
      const apiError = ApiError.database("更新服务器绑定配置失败：未能找到服务器");
      return createErrorResponse(event, apiError);
    }
    return createApiResponse(event, "更新服务器绑定配置成功", StatusCodes.OK);
  } catch (err) {
    logger.error({ err }, "更新服务器绑定配置失败");
    const apiError = ApiError.internal("更新服务器绑定配置失败");
    return createErrorResponse(event, apiError);
  }
});
