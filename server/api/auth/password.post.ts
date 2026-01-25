import { ApiError, createErrorResponse } from "#shared/error";
import { createApiResponse } from "#shared/types";
import { validatePasswordStrength } from "#shared/utils/password";
import { eq } from "drizzle-orm";
import { defineEventHandler } from "h3";
import { StatusCodes } from "http-status-codes";
import { z } from "zod";
import { getDatabase } from "~~/server/db/client";
import { users } from "~~/server/db/schema";

const bodySchema = z.object({
  currentPassword: z.string().optional(),
  newPassword: z.string().min(1, "新密码不能为空")
});

export default defineEventHandler(async (event) => {
  try {
    const database = await getDatabase();
    const user = await database.query.users.findFirst();

    // 如果用户已设置密码则需要认证
    if (user?.passwordHash) {
      const session = await requireUserSession(event);
      if (!session?.user) {
        return createErrorResponse(event, ApiError.unauthorized("未认证"));
      }
    }

    const { currentPassword, newPassword } = await readValidatedBody(event, bodySchema.parse);

    // 密码强度验证
    const validation = validatePasswordStrength(newPassword);
    if (!validation.isValid) {
      return createErrorResponse(event, ApiError.validation(validation.error!));
    }

    // 验证当前密码（如果已设置）
    if (user?.passwordHash) {
      if (!currentPassword) {
        return createErrorResponse(event, ApiError.validation("当前密码不能为空"));
      }

      const isValid = await verifyPassword(user.passwordHash, currentPassword);
      if (!isValid) {
        return createErrorResponse(event, ApiError.validation("当前密码错误"));
      }
    }

    const passwordHash = await hashPassword(newPassword);

    // 更新或创建用户
    if (user) {
      await database.update(users).set({ passwordHash, updatedAt: new Date() }).where(eq(users.id, user.id));
    } else {
      await database.insert(users).values({
        username: "admin",
        passwordHash,
        createdAt: new Date(),
        updatedAt: new Date()
      });
    }

    return createApiResponse(event, "密码设置成功", StatusCodes.OK);
  } catch (error) {
    logger.error({ error }, "设置密码失败");
    return createErrorResponse(event, ApiError.internal("设置密码失败"));
  }
});
