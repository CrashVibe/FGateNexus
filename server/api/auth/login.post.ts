import { ApiError, createErrorResponse } from "#shared/error";
import { createApiResponse } from "#shared/types";
import { defineEventHandler, readBody } from "h3";
import { StatusCodes } from "http-status-codes";
import { authenticator } from "otplib";
import { getDatabase } from "~~/server/db/client";
import { userSessions } from "~~/server/db/schema";
import { createSessionExpiry, generateSessionToken, verifyPassword } from "~~/server/utils/auth";

export default defineEventHandler(async (event) => {
    try {
        const body = await readBody(event);
        const { password, twoFactorToken } = body;

        if (!password) {
            const apiError = ApiError.validation("密码不能为空");
            return createErrorResponse(event, apiError);
        }

        const database = await getDatabase();

        // 获取用户
        const user = await database.query.users.findFirst();
        if (!user || !user.passwordHash || !user.salt) {
            const apiError = ApiError.validation("用户不存在或未设置密码");
            return createErrorResponse(event, apiError);
        }

        // 验证密码
        const isPasswordValid = await verifyPassword(password, user.salt, user.passwordHash);
        if (!isPasswordValid) {
            const apiError = ApiError.validation("密码错误");
            return createErrorResponse(event, apiError);
        }

        // 如果启用了2FA，验证TOTP
        if (user.twoFactorEnabled && user.twoFactorSecret) {
            if (!twoFactorToken) {
                const apiError = ApiError.validation("需要输入2FA验证码");
                return createErrorResponse(event, apiError);
            }

            const isValid = authenticator.verify({
                token: twoFactorToken,
                secret: user.twoFactorSecret
            });

            if (!isValid) {
                const apiError = ApiError.validation("2FA验证码错误");
                return createErrorResponse(event, apiError);
            }
        }

        // 创建会话
        const sessionToken = generateSessionToken();
        const expiresAt = createSessionExpiry(24); // 24小时

        await database.insert(userSessions).values({
            userId: user.id,
            sessionToken,
            expiresAt
        });

        // 设置cookie
        setCookie(event, "session-token", sessionToken, {
            httpOnly: true,
            secure: false, // 在生产环境中应该设置为true
            sameSite: "strict",
            maxAge: 24 * 60 * 60 // 24小时
        });

        return createApiResponse(event, "登录成功", StatusCodes.OK);
    } catch (error) {
        console.error("登录失败:", error);
        const apiError = ApiError.internal("登录失败");
        return createErrorResponse(event, apiError);
    }
});
