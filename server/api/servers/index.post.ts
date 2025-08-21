import { defineEventHandler, readBody } from "h3";
import { getDatabase } from "~~/server/db/client";
import { servers } from "~~/server/db/schema";
import { createApiResponse } from "#shared/types";
import { ApiError, createErrorResponse } from "#shared/error";
import { StatusCodes } from "http-status-codes";
import { serverSchemaRequset } from "#shared/schemas/server/servers";
import { getDefaultBindingConfig } from "~~/shared/utils/binding";
import { getDefaultChatSyncConfig } from "~~/shared/utils/chatSync";

export default defineEventHandler(async (event) => {
    try {
        const body = await readBody(event);
        const parsed = serverSchemaRequset.safeParse(body);

        if (!parsed.success) {
            const apiError = ApiError.validation("添加服务器失败");
            return createErrorResponse(event, apiError, parsed.error);
        }

        const database = await getDatabase();
        const serverData = {
            name: parsed.data.servername,
            token: parsed.data.token
        };
        await database.insert(servers).values({
            name: serverData.name,
            token: serverData.token,
            bindingConfig: getDefaultBindingConfig(),
            chatSyncConfig: getDefaultChatSyncConfig()
        });
        return createApiResponse(event, "添加服务器成功", StatusCodes.CREATED);
    } catch (err) {
        console.error("Database error:", err);
        const apiError = ApiError.database("添加服务器失败");
        return createErrorResponse(event, apiError);
    }
});
