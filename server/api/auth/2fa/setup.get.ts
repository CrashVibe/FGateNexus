import { ApiError, createErrorResponse } from "#shared/error";
import { createApiResponse } from "#shared/types";
import { defineEventHandler } from "h3";
import { StatusCodes } from "http-status-codes";
import { authenticator } from "otplib";
import { getDatabase } from "~~/server/db/client";

export default defineEventHandler(async (event) => {
    try {
        const database = await getDatabase();

        // 获取用户
        const user = await database.query.users.findFirst();
        if (!user) {
            const apiError = ApiError.notFound("用户不存在");
            return createErrorResponse(event, apiError);
        }

        if (!user.passwordHash) {
            const apiError = ApiError.validation("请先设置密码");
            return createErrorResponse(event, apiError);
        }

        // 生成2FA密钥
        const secret = authenticator.generateSecret();
        const service = "FGATE";
        const account = user.username;
        const keyuri = authenticator.keyuri(account, service, secret);

        return createApiResponse(event, "2FA设置信息生成成功", StatusCodes.OK, {
            keyuri,
            secret
        });
    } catch (error) {
        console.error("生成2FA设置信息失败:", error);
        const apiError = ApiError.internal("生成2FA设置信息失败");
        return createErrorResponse(event, apiError);
    }
});
