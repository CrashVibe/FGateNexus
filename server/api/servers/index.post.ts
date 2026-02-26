import { ApiError, createErrorResponse } from "#shared/error";
import { createApiResponse } from "#shared/types";
import { defineEventHandler, readBody } from "h3";
import { StatusCodes } from "http-status-codes";
import { db } from "~~/server/db/client";
import { servers } from "~~/server/db/schema";
import { BindingConfigSchema } from "~~/shared/schemas/server/binding";
import { chatSyncConfigSchema } from "~~/shared/schemas/server/chatSync";
import { CommandConfigSchema } from "~~/shared/schemas/server/command";
import { NotifyConfigSchema } from "~~/shared/schemas/server/notify";
import { ServersAPI } from "~~/shared/schemas/server/servers";

export default defineEventHandler(async (event) => {
  try {
    const parsed = ServersAPI.POST.request.safeParse(await readBody(event));

    if (!parsed.success) {
      const apiError = ApiError.validation("添加服务器失败");
      return createErrorResponse(event, apiError, parsed.error);
    }

    const serverData = {
      name: parsed.data.servername,
      token: parsed.data.token
    };
    await db.insert(servers).values({
      name: serverData.name,
      token: serverData.token,
      bindingConfig: BindingConfigSchema.parse({}),
      chatSyncConfig: chatSyncConfigSchema.parse({}),
      commandConfig: CommandConfigSchema.parse({}),
      notifyConfig: NotifyConfigSchema.parse({})
    });
    return createApiResponse(event, "添加服务器成功", StatusCodes.CREATED);
  } catch (err) {
    logger.error({ err }, "Database error");
    const apiError = ApiError.database("添加服务器失败");
    return createErrorResponse(event, apiError);
  }
});
