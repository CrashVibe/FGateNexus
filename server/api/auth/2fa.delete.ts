import { ApiError, createErrorResponse } from "#shared/error";
import { createApiResponse } from "#shared/types";
import { eq } from "drizzle-orm";
import { defineEventHandler } from "h3";
import { StatusCodes } from "http-status-codes";
import { db } from "~~/server/db/client";
import { users } from "~~/server/db/schema";

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

    // 禁用 2FA
    await db
      .update(users)
      .set({
        twoFactorSecret: null,
        twoFactorEnabled: false,
        updatedAt: new Date()
      })
      .where(eq(users.id, user.id));

    return createApiResponse(event, "2FA 已禁用", StatusCodes.OK);
  } catch (error) {
    logger.error({ error }, "禁用 2FA 失败");
    const apiError = ApiError.internal("禁用 2FA 失败");
    return createErrorResponse(event, apiError);
  }
});
