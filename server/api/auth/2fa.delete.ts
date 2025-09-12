import { ApiError, createErrorResponse } from "#shared/error";
import { createApiResponse } from "#shared/types";
import { eq } from "drizzle-orm";
import { defineEventHandler } from "h3";
import { StatusCodes } from "http-status-codes";
import { getDatabase } from "~~/server/db/client";
import { users } from "~~/server/db/schema";

export default defineEventHandler(async (event) => {
    try {
        const database = await getDatabase();

        // 获取用户
        const user = await database.query.users.findFirst();
        if (!user) {
            const apiError = ApiError.notFound("用户不存在");
            return createErrorResponse(event, apiError);
        }

        // 禁用2FA
        await database
            .update(users)
            .set({
                twoFactorSecret: null,
                twoFactorEnabled: false,
                updatedAt: new Date()
            })
            .where(eq(users.id, user.id));

        return createApiResponse(event, "2FA已禁用", StatusCodes.OK);
    } catch (error) {
        console.error("禁用2FA失败:", error);
        const apiError = ApiError.internal("禁用2FA失败");
        return createErrorResponse(event, apiError);
    }
});
