import { ApiError, createErrorResponse } from "#shared/error";
import { loginBodySchema } from "#shared/schemas/auth";
import { createApiResponse } from "#shared/types";
import { StatusCodes } from "http-status-codes";
import { authenticator } from "otplib";
import { getDatabase } from "~~/server/db/client";
import { checkRateLimit } from "~~/server/utils/rateLimit";

export default defineEventHandler(async (event) => {
  try {
    const clientIP = getRequestIP(event, { xForwardedFor: true }) || "unknown";
    const rateLimit = await checkRateLimit(clientIP, "login");

    if (!rateLimit.allowed) {
      logger.warn({ ip: clientIP }, "登录请求速率超限");
      const retryMsg = rateLimit.retryAfter
        ? `请求过于频繁，请 ${rateLimit.retryAfter} 秒后重试`
        : "请求过于频繁，请稍后再试";
      return createErrorResponse(event, ApiError.tooManyRequests(retryMsg));
    }

    const body = await readBody(event);
    const parsed = loginBodySchema.safeParse(body);

    if (!parsed.success) {
      return createErrorResponse(event, ApiError.validation("请求参数错误"), parsed.error);
    }

    const { password, twoFactorToken } = parsed.data;
    const database = await getDatabase();
    const user = await database.query.users.findFirst();

    if (!user || !user.passwordHash) {
      return createErrorResponse(event, ApiError.unauthorized("密码错误"));
    }

    const isPasswordValid = await verifyPassword(user.passwordHash, password);
    if (!isPasswordValid) {
      logger.warn({ userId: user.id }, "登录失败：密码错误");
      return createErrorResponse(event, ApiError.unauthorized("密码错误"));
    }

    // 验证 2FA
    if (user.twoFactorEnabled && user.twoFactorSecret) {
      if (!twoFactorToken) {
        return createErrorResponse(event, ApiError.unauthorized("需要输入 2FA 验证码"));
      }

      const isValid = authenticator.verify({
        token: twoFactorToken,
        secret: user.twoFactorSecret
      });

      if (!isValid) {
        logger.warn({ userId: user.id }, "登录失败：2FA 验证码错误");
        return createErrorResponse(event, ApiError.unauthorized("2FA 验证码错误"));
      }
    }

    logger.info(
      {
        userId: user.id,
        username: user.username,
        ip: getRequestIP(event),
        userAgent: getHeader(event, "user-agent")
      },
      "登录成功"
    );

    await setUserSession(event, {
      user: {
        id: user.id,
        username: user.username,
        has2FA: user.twoFactorEnabled
      }
    });

    return createApiResponse(event, "登录成功", StatusCodes.OK);
  } catch (error) {
    logger.error({ error }, "登录失败");
    return createErrorResponse(event, ApiError.internal("登录失败"));
  }
});
