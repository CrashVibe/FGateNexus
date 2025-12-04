import { createApiResponse } from "#shared/types";
import { defineEventHandler } from "h3";
import { StatusCodes } from "http-status-codes";
import { getDatabase } from "~~/server/db/client";

export default defineEventHandler(async (event) => {
    try {
        const database = await getDatabase();

        // 检查是否存在用户
        const user = await database.query.users.findFirst();

        const authStatus = {
            hasPassword: false,
            has2FA: false,
            isAuthenticated: false
        };

        if (user) {
            authStatus.hasPassword = !!user.passwordHash;
            authStatus.has2FA = user.twoFactorEnabled;

            // 检查会话状态
            const sessionToken = getCookie(event, "session-token");
            if (sessionToken) {
                const session = await database.query.userSessions.findFirst({
                    where: (session, { eq, and }) =>
                        and(eq(session.sessionToken, sessionToken), eq(session.userId, user.id))
                });
                if (session && session.expiresAt > new Date()) {
                    authStatus.isAuthenticated = true;
                }
            }
        }

        return createApiResponse(event, "认证状态查询成功", StatusCodes.OK, authStatus);
    } catch (error) {
        logger.error({ error }, "获取认证状态失败");
        return createApiResponse(event, "获取认证状态失败", StatusCodes.INTERNAL_SERVER_ERROR);
    }
});
