import type { AuthStatus } from "~~/shared/schemas/auth";

import { createApiResponse } from "#shared/types";
import { defineEventHandler } from "h3";
import { StatusCodes } from "http-status-codes";
import { db } from "~~/server/db/client";
import { ApiError, createErrorResponse } from "~~/shared/error";

export default defineEventHandler(async (event) => {
  try {
    // 检查是否存在用户
    const user = await db.query.users.findFirst();

    const authStatus: AuthStatus = {
      hasPassword: false,
      has2FA: false
    };

    if (user) {
      authStatus.hasPassword = !!user.passwordHash;
      authStatus.has2FA = user.twoFactorEnabled;
    }

    return createApiResponse(event, "认证状态查询成功", StatusCodes.OK, authStatus);
  } catch (error) {
    logger.error({ error }, "获取认证状态失败");
    return createErrorResponse(event, ApiError.internalServerError("获取认证状态失败"));
  }
});
