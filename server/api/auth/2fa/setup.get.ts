import { ApiError, createErrorResponse } from "#shared/error";
import { createApiResponse } from "#shared/types";
import { defineEventHandler } from "h3";
import { StatusCodes } from "http-status-codes";
import { generateSecret, generateURI } from "otplib";
import { db } from "~~/server/db/client";

export default defineEventHandler(async (event) => {
  try {
    // 需要用户已认证
    const session = await requireUserSession(event);
    if (!session?.user) {
      const apiError = ApiError.unauthorized("未认证");
      return createErrorResponse(event, apiError);
    }

    // 获取用户
    const user = await db.query.users.findFirst();
    if (!user) {
      const apiError = ApiError.notFound("用户不存在");
      return createErrorResponse(event, apiError);
    }

    if (!user.passwordHash) {
      const apiError = ApiError.validation("请先设置密码");
      return createErrorResponse(event, apiError);
    }

    // 生成 2FA 密钥
    const secret = generateSecret();
    const service = "FGATE";
    const account = user.username;
    const keyuri = generateURI({
      issuer: service,
      label: account,
      secret
    });

    return createApiResponse(event, "2FA 设置信息生成成功", StatusCodes.OK, {
      keyuri,
      secret
    });
  } catch (error) {
    logger.error({ error }, "生成 2FA 设置信息失败");
    const apiError = ApiError.internal("生成 2FA 设置信息失败");
    return createErrorResponse(event, apiError);
  }
});
