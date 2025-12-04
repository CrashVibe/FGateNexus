import { eq } from "drizzle-orm";
import type { EventHandlerRequest, H3Event } from "h3";
import { createError, getCookie, setCookie } from "h3";
import { getDatabase } from "~~/server/db/client";
import { userSessions } from "~~/server/db/schema";
import { logger } from "./logger";

export async function requireAuth(event: H3Event<EventHandlerRequest>) {
    // 检查是否有用户设置了密码
    const database = await getDatabase();
    const user = await database.query.users.findFirst();

    if (!user || !user.passwordHash) {
        return;
    }

    // 检查会话
    const sessionToken = getCookie(event, "session-token");
    if (!sessionToken) {
        logger.error("未登录: 缺少 session-token cookie");
        throw createError({
            statusCode: 401,
            statusMessage: "未登录",
            data: { message: "未登录", code: 401 }
        });
    }

    const session = await database.query.userSessions.findFirst({
        where: (session, { eq, and }) => and(eq(session.sessionToken, sessionToken), eq(session.userId, user.id))
    });

    if (!session || session.expiresAt < new Date()) {
        // 删除过期会话
        if (session) {
            await database.delete(userSessions).where(eq(userSessions.id, session.id));
        }

        setCookie(event, "session-token", "", { maxAge: 0 });
        logger.error("会话已过期或无效");
        throw createError({
            statusCode: 401,
            statusMessage: "会话已过期",
            data: { message: "会话已过期", code: 401 }
        });
    }

    event.context.user = user;
    event.context.session = session;
}
