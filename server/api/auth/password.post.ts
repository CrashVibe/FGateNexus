import { ApiError, createErrorResponse } from "#shared/error";
import { createApiResponse } from "#shared/types";
import { eq } from "drizzle-orm";
import { defineEventHandler, readBody } from "h3";
import { StatusCodes } from "http-status-codes";
import { getDatabase } from "~~/server/db/client";
import { users } from "~~/server/db/schema";
import { generateSalt, hashPassword, verifyPassword } from "~~/server/utils/auth";

export default defineEventHandler(async (event) => {
    try {
        const body = await readBody(event);
        const { currentPassword, newPassword } = body;

        if (!newPassword || newPassword.length < 6) {
            const apiError = ApiError.validation("新密码长度至少6位");
            return createErrorResponse(event, apiError);
        }

        const database = await getDatabase();

        // 检查是否已有用户
        const user = await database.query.users.findFirst();

        if (user) {
            // 检查用户是否已设置密码
            if (user.passwordHash && user.salt) {
                // 已有密码需验证当前密码
                if (!currentPassword) {
                    const apiError = ApiError.validation("当前密码不能为空");
                    return createErrorResponse(event, apiError);
                }

                const isCurrentPasswordValid = await verifyPassword(currentPassword, user.salt, user.passwordHash);
                if (!isCurrentPasswordValid) {
                    const apiError = ApiError.validation("当前密码错误");
                    return createErrorResponse(event, apiError);
                }
            }
        }

        const salt = generateSalt();
        const passwordHash = await hashPassword(newPassword, salt);

        if (user) {
            // 更新
            await database
                .update(users)
                .set({
                    passwordHash,
                    salt,
                    updatedAt: new Date()
                })
                .where(eq(users.id, user.id));
        } else {
            // 创建
            // TODO: 自定义用户名，再看吧，如果有人要的话？不知道会不会有人要，好奇怪。
            await database.insert(users).values({
                username: "admin",
                passwordHash,
                salt,
                createdAt: new Date(),
                updatedAt: new Date()
            });
        }

        return createApiResponse(event, "密码设置成功", StatusCodes.OK);
    } catch (error) {
        console.error("设置密码失败:", error);
        const apiError = ApiError.internal("设置密码失败");
        return createErrorResponse(event, apiError);
    }
});
