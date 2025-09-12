import { createApiResponse } from "#shared/types";
import { eq } from "drizzle-orm";
import { defineEventHandler } from "h3";
import { StatusCodes } from "http-status-codes";
import { getDatabase } from "~~/server/db/client";
import { userSessions } from "~~/server/db/schema";

export default defineEventHandler(async (event) => {
    try {
        const sessionToken = getCookie(event, "session-token");

        if (sessionToken) {
            const database = await getDatabase();

            // 删除会话
            await database.delete(userSessions).where(eq(userSessions.sessionToken, sessionToken));
        }

        // 清除cookie
        setCookie(event, "session-token", "", { maxAge: 0 });

        return createApiResponse(event, "登出成功", StatusCodes.OK);
    } catch (error) {
        console.error("登出失败:", error);
        // 即使失败也清除cookie
        setCookie(event, "session-token", "", { maxAge: 0 });
        return createApiResponse(event, "登出成功", StatusCodes.OK);
    }
});
