import { StatusCodes } from "http-status-codes";
import { createApiResponse } from "~~/shared/types";

export default defineEventHandler(async (event) => {
    try {
        // 清除会话
        await clearUserSession(event);

        return createApiResponse(event, "登出成功", StatusCodes.OK);
    } catch (error) {
        logger.error({ error }, "登出失败");
        await clearUserSession(event);
        return createApiResponse(event, "登出成功", StatusCodes.OK);
    }
});
