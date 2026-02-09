import { ApiError, createErrorResponse } from "#shared/error";
import { createApiResponse } from "#shared/types";
import { eq } from "drizzle-orm";
import { defineEventHandler, readBody } from "h3";
import { StatusCodes } from "http-status-codes";
import { getDatabase } from "~~/server/db/client";
import { users } from "~~/server/db/schema";
import { LoginAPI } from "~~/shared/schemas/auth";

export default defineEventHandler(async (event) => {
  try {
    const session = await requireUserSession(event);
    if (!session?.user) {
      const apiError = ApiError.unauthorized("未认证");
      return createErrorResponse(event, apiError);
    }

    const database = await getDatabase();

    // 获取用户
    const user = await database.query.users.findFirst({
      where: eq(users.id, session.user.id)
    });
    if (!user) {
      const apiError = ApiError.notFound("用户不存在");
      return createErrorResponse(event, apiError);
    }

    if (!user.passwordHash) {
      const apiError = ApiError.badRequest("用户未设置密码");
      return createErrorResponse(event, apiError);
    }

    const body = await readBody(event);
    const validationResult = LoginAPI.DELETE.request.safeParse(body);

    if (!validationResult.success) {
      const apiError = ApiError.badRequest("请求参数错误");
      return createErrorResponse(event, apiError, validationResult.error);
    }

    const { currentPassword } = validationResult.data;

    const isPasswordValid = await verifyPassword(user.passwordHash, currentPassword);
    if (!isPasswordValid) {
      const apiError = ApiError.unauthorized("当前密码错误");
      return createErrorResponse(event, apiError);
    }

    // 删除密码、2FA 和相关数据
    await database
      .update(users)
      .set({
        passwordHash: null,
        twoFactorSecret: null,
        twoFactorEnabled: false,
        updatedAt: new Date()
      })
      .where(eq(users.id, user.id));

    // 清除所有会话
    await clearUserSession(event);

    return createApiResponse(event, "密码已删除，所有认证方式已清除", StatusCodes.OK);
  } catch (error) {
    logger.error({ error }, "删除密码失败");
    const apiError = ApiError.internal("删除密码失败");
    return createErrorResponse(event, apiError);
  }
});
