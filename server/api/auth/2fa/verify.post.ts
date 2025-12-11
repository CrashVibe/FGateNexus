import { ApiError, createErrorResponse } from "#shared/error";
import { createApiResponse } from "#shared/types";
import { eq } from "drizzle-orm";
import { defineEventHandler } from "h3";
import { StatusCodes } from "http-status-codes";
import { authenticator } from "otplib";
import { z } from "zod";
import { getDatabase } from "~~/server/db/client";
import { users } from "~~/server/db/schema";

const bodySchema = z.object({
    token: z.string().min(1, "验证码不能为空"),
    secret: z.string().min(1, "密钥不能为空")
});

export default defineEventHandler(async (event) => {
    try {
        // 需要用户已认证
        const session = await requireUserSession(event);
        if (!session?.user) {
            const apiError = ApiError.unauthorized("未认证");
            return createErrorResponse(event, apiError);
        }

        const { token, secret } = await readValidatedBody(event, bodySchema.parse);

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
        logger.error({ error }, "2FA验证失败");
        const apiError = ApiError.internal("2FA验证失败");
        return createErrorResponse(event, apiError);
    }
});
