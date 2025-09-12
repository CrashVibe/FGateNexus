import { ApiError, createErrorResponse } from "#shared/error";
import { createApiResponse } from "#shared/types";
import { eq } from "drizzle-orm";
import { defineEventHandler, readBody } from "h3";
import { StatusCodes } from "http-status-codes";
import { authenticator } from "otplib";
import { getDatabase } from "~~/server/db/client";
import { users } from "~~/server/db/schema";

export default defineEventHandler(async (event) => {
    try {
        const body = await readBody(event);
        const { token, secret } = body;

        if (!token || !secret) {
            const apiError = ApiError.validation("验证码和密钥不能为空");
            return createErrorResponse(event, apiError);
        }

        const database = await getDatabase();

        // 获取用户
        const user = await database.query.users.findFirst();
        if (!user) {
            const apiError = ApiError.notFound("用户不存在");
            return createErrorResponse(event, apiError);
        }

        // 验证TOTP令牌
        const isValid = authenticator.verify({ token, secret });
        if (!isValid) {
            const apiError = ApiError.validation("验证码错误");
            return createErrorResponse(event, apiError);
        }

        // 启用2FA
        await database
            .update(users)
            .set({
                twoFactorSecret: secret,
                twoFactorEnabled: true,
                updatedAt: new Date()
            })
            .where(eq(users.id, user.id));

        return createApiResponse(event, "2FA验证成功，已启用双重验证", StatusCodes.OK);
    } catch (error) {
        console.error("2FA验证失败:", error);
        const apiError = ApiError.internal("2FA验证失败");
        return createErrorResponse(event, apiError);
    }
});
