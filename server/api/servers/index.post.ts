import { defineEventHandler, readBody } from "h3";
import { StatusCodes } from "http-status-codes";
import { db } from "~~/server/db/client";
import { servers } from "~~/server/db/schema";
import { BindingConfigSchema } from "~~/shared/schemas/server/binding";
import { chatSyncConfigSchema } from "~~/shared/schemas/server/chat-sync";
import { CommandConfigSchema } from "~~/shared/schemas/server/command";
import { NotifyConfigSchema } from "~~/shared/schemas/server/notify";
import { ServersAPI } from "~~/shared/schemas/server/servers";

import { ApiError, createErrorResponse } from "#shared/error";
import { createApiResponse } from "#shared/types";

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
      chatSyncConfig: chatSyncConfigSchema.parse({}),
      commandConfig: CommandConfigSchema.parse({}),
      name: serverData.name,
      notifyConfig: NotifyConfigSchema.parse({}),
      token: serverData.token,
    });
    return createApiResponse(event, "添加服务器成功", StatusCodes.CREATED);
  } catch (error) {
    logger.error({ error }, "Database error");
    const apiError = ApiError.database("添加服务器失败");
    return createErrorResponse(event, apiError);
  }
});
