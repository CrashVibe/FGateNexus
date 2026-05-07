import { defineEventHandler, readBody } from "h3";
import { StatusCodes } from "http-status-codes";
import { db } from "~~/server/db/client";
import { servers } from "~~/server/db/schema";
import { BindingConfigSchema } from "~~/shared/model/server/schema/binding";
import { ChatSyncConfigSchema } from "~~/shared/model/server/schema/chat-sync";
import { CommandConfigSchema } from "~~/shared/model/server/schema/command";
import { NotifyConfigSchema } from "~~/shared/model/server/schema/notify";

import { createApiResponse } from "#shared/model";
import { ApiError, createErrorResponse } from "#shared/model/error";
import { ServersAPI } from "#shared/model/server/api";
export default defineEventHandler(async (event) => {
  try {
    const parsed = ServersAPI.POST.request.safeParse(await readBody(event));

    if (!parsed.success) {
      const apiError = ApiError.validation("添加服务器失败");
      return createErrorResponse(event, apiError, parsed.error);
    }

    const serverData = {
      name: parsed.data.servername,
      token: parsed.data.token,
    };
    await db.insert(servers).values({
      bindingConfig: BindingConfigSchema.parse({}),
      chatSyncConfig: ChatSyncConfigSchema.parse({}),
      commandConfig: CommandConfigSchema.parse({}),
      name: serverData.name,
      notifyConfig: NotifyConfigSchema.parse({}),
      token: serverData.token,
    });
    return createApiResponse(event, "添加服务器成功", StatusCodes.CREATED);
  } catch (error) {
    logger.error(error, "Database error");
    const apiError = ApiError.database("添加服务器失败");
    return createErrorResponse(event, apiError);
  }
});
