import { ApiError, createErrorResponse } from "#shared/error";
import { createApiResponse } from "#shared/types";
import { eq } from "drizzle-orm";
import { defineEventHandler } from "h3";
import { StatusCodes } from "http-status-codes";
import { getDatabase } from "~~/server/db/client";
import { users, userSessions } from "~~/server/db/schema";

export default defineEventHandler(async (event) => {
    try {
        const database = await getDatabase();

        // 获取用户
        const user = await database.query.users.findFirst();
        if (!user) {
            const apiError = ApiError.notFound("用户不存在");
            return createErrorResponse(event, apiError);
        }

        // 删除密码、2FA和相关数据
        await database
            .update(users)
            .set({
                passwordHash: null,
                salt: null,
                twoFactorSecret: null,
                twoFactorEnabled: false,
                updatedAt: new Date()
            })
            .where(eq(users.id, user.id));

        // 删除所有会话
        await database.delete(userSessions).where(eq(userSessions.userId, user.id));

        return createApiResponse(event, "密码已删除，所有认证方式已清除", StatusCodes.OK);
    } catch (error) {
        console.error("删除密码失败:", error);
        const apiError = ApiError.internal("删除密码失败");
        return createErrorResponse(event, apiError);
    }
});
