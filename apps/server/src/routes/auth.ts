import { eq } from "drizzle-orm";
import { Hono } from "hono";
import type { Context } from "hono";
import { rateLimiter } from "hono-rate-limiter";
import { getConnInfo } from "hono/bun";
import { StatusCodes } from "http-status-codes";
import { generateSecret, generateURI, verify } from "otplib";
import { z } from "zod";

import { db } from "#server/db/client";
import { userTable } from "#server/db/schema";
import { hashPassword, verifyPassword } from "#server/http/password";
import { fail, guard, ok, parseBody, readJson } from "#server/http/respond";
import {
  clearUserSession,
  getUserSession,
  requireUserSession,
  setUserSession,
} from "#server/http/session";
import { logger } from "#server/utils/logger";
import { LoginAPI, PasswordAPI } from "#shared/model/auth/api";
import type { AuthStatus } from "#shared/model/auth/schema";
import { ApiError } from "#shared/model/error";
import { validatePasswordStrength } from "#shared/utils/password";

const getClientIP = (c: Context): string =>
  c.req.header("x-forwarded-for")?.split(",")[0]?.trim() ??
  getConnInfo(c).remote.address ??
  "unknown";

const loginRateLimiter = rateLimiter({
  handler: (c) => {
    logger.warn({ ip: getClientIP(c) }, "登录请求速率超限");
    return fail(c, ApiError.tooManyRequests("请求过于频繁，请稍后再试"));
  },
  keyGenerator: getClientIP,
  limit: 5,
  windowMs: 60 * 1000,
});

export const authRouter = new Hono()
  .post(
    "/login",
    loginRateLimiter,
    guard("登录失败", async (c) => {
      const clientIP = getClientIP(c);

      const { password, twoFactorToken } = await parseBody(
        c,
        LoginAPI.POST.request,
      );
      const user = await db.query.userTable.findFirst();
      if (!user || user.passwordHash === null) {
        return fail(c, ApiError.unauthorized("无密码，无需登陆"));
      }

      const isPasswordValid = await verifyPassword(user.passwordHash, password);
      if (!isPasswordValid) {
        logger.warn({ userId: user.id }, "登录失败：密码错误");
        return fail(c, ApiError.unauthorized("密码错误"));
      }

      if (user.twoFactorEnabled && user.twoFactorSecret !== null) {
        if (twoFactorToken === undefined) {
          logger.warn({ userId: user.id }, "登录失败：缺少 2FA 验证码");
          return fail(c, ApiError.unauthorized("需要 2FA 验证码"));
        }
        const result = await verify({
          secret: user.twoFactorSecret,
          token: twoFactorToken.join(""),
        });
        if (!result.valid) {
          logger.warn({ userId: user.id }, "登录失败：2FA 验证码错误");
          return fail(c, ApiError.unauthorized("2FA 验证码错误"));
        }
      }

      logger.info(
        {
          ip: clientIP,
          userAgent: c.req.header("user-agent"),
          userId: user.id,
          username: user.username,
        },
        "登录成功",
      );

      await setUserSession(c, {
        has2FA: user.twoFactorEnabled,
        id: user.id,
        username: user.username,
      });

      return ok(c, "登录成功", StatusCodes.OK);
    }),
  )
  .post("/logout", async (c) => {
    clearUserSession(c);
    return ok(c, "登出成功", StatusCodes.OK);
  })
  .get(
    "/status",
    guard("获取认证状态失败", async (c) => {
      const user = await db.query.userTable.findFirst();
      const session = await getUserSession(c);
      const authStatus: AuthStatus = {
        has2FA: false,
        hasPassword: false,
        loggedIn: session !== undefined,
      };
      if (user) {
        authStatus.hasPassword = user.passwordHash !== null;
        authStatus.has2FA = user.twoFactorEnabled;
      }
      return ok(c, "认证状态查询成功", StatusCodes.OK, authStatus);
    }),
  )
  .post(
    "/password",
    guard("设置密码失败", async (c) => {
      const user = await db.query.userTable.findFirst();

      // 已设置密码则需认证才能修改；首次设置（尚无密码）开放。
      if (user?.passwordHash) {
        await requireUserSession(c);
      }

      const { currentPassword, newPassword } = await parseBody(
        c,
        PasswordAPI.POST.request,
      );

      const validation = validatePasswordStrength(newPassword);
      if (!validation.isValid) {
        return fail(c, ApiError.validation(validation.error ?? ""));
      }

      if (user?.passwordHash !== undefined && user.passwordHash !== null) {
        if (currentPassword === undefined) {
          return fail(c, ApiError.validation("当前密码不能为空"));
        }
        const isValid = await verifyPassword(
          user.passwordHash,
          currentPassword,
        );
        if (!isValid) {
          return fail(c, ApiError.validation("当前密码错误"));
        }
      }

      const passwordHash = await hashPassword(newPassword);
      await (user
        ? db
            .update(userTable)
            .set({ passwordHash, updatedAt: new Date() })
            .where(eq(userTable.id, user.id))
        : db.insert(userTable).values({
            createdAt: new Date(),
            passwordHash,
            updatedAt: new Date(),
            username: "admin",
          }));

      return ok(c, "密码设置成功", StatusCodes.OK);
    }),
  )
  .delete(
    "/password",
    guard("删除密码失败", async (c) => {
      const session = await requireUserSession(c);

      const user = await db.query.userTable.findFirst({
        where: eq(userTable.id, session.id),
      });
      if (!user) {
        return fail(c, ApiError.notFound("用户不存在"));
      }
      if (user.passwordHash === null || user.passwordHash === "") {
        return fail(c, ApiError.badRequest("用户未设置密码"));
      }

      const parsed = LoginAPI.DELETE.request.safeParse(await readJson(c));
      if (!parsed.success) {
        return fail(c, ApiError.badRequest("请求参数错误"), parsed.error);
      }

      const isPasswordValid = await verifyPassword(
        user.passwordHash,
        parsed.data.currentPassword,
      );
      if (!isPasswordValid) {
        return fail(c, ApiError.unauthorized("当前密码错误"));
      }

      await db
        .update(userTable)
        .set({
          passwordHash: null,
          twoFactorEnabled: false,
          twoFactorSecret: null,
          updatedAt: new Date(),
        })
        .where(eq(userTable.id, user.id));

      clearUserSession(c);
      return ok(c, "密码已删除，所有认证方式已清除", StatusCodes.OK);
    }),
  )
  .get(
    "/2fa/setup",
    guard("生成 2FA 设置信息失败", async (c) => {
      await requireUserSession(c);
      const user = await db.query.userTable.findFirst();
      if (!user) {
        return fail(c, ApiError.notFound("用户不存在"));
      }
      if (user.passwordHash === null || user.passwordHash === "") {
        return fail(c, ApiError.validation("请先设置密码"));
      }

      const secret = generateSecret();
      const keyuri = generateURI({
        issuer: "FGATE",
        label: user.username,
        secret,
      });

      return ok(c, "2FA 设置信息生成成功", StatusCodes.OK, { keyuri, secret });
    }),
  )
  .post(
    "/2fa/verify",
    guard("2FA 验证失败", async (c) => {
      await requireUserSession(c);

      const bodySchema = z.object({
        secret: z.string().min(1, "密钥不能为空"),
        token: z.string().min(1, "验证码不能为空"),
      });
      const { secret, token } = await parseBody(c, bodySchema, "参数错误");

      const user = await db.query.userTable.findFirst();
      if (!user) {
        return fail(c, ApiError.notFound("用户不存在"));
      }

      const result = await verify({ secret, token });
      if (!result.valid) {
        return fail(c, ApiError.validation("验证码错误"));
      }

      await db
        .update(userTable)
        .set({
          twoFactorEnabled: true,
          twoFactorSecret: secret,
          updatedAt: new Date(),
        })
        .where(eq(userTable.id, user.id));

      return ok(c, "2FA 验证成功，已启用双重验证", StatusCodes.OK);
    }),
  )
  .delete(
    "/2fa",
    guard("禁用 2FA 失败", async (c) => {
      await requireUserSession(c);
      const user = await db.query.userTable.findFirst();
      if (!user) {
        return fail(c, ApiError.notFound("用户不存在"));
      }

      await db
        .update(userTable)
        .set({
          twoFactorEnabled: false,
          twoFactorSecret: null,
          updatedAt: new Date(),
        })
        .where(eq(userTable.id, user.id));

      return ok(c, "2FA 已禁用", StatusCodes.OK);
    }),
  );
