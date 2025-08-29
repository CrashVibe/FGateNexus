import { ApiError, createErrorResponse } from "#shared/error";
import { createApiResponse } from "#shared/types";
import { and, eq, inArray, sql } from "drizzle-orm";
import { defineEventHandler, getRouterParam, readBody } from "h3";
import { StatusCodes } from "http-status-codes";
import { getDatabase } from "~~/server/db/client";
import { servers, targets } from "~~/server/db/schema";
import { notifyPatchBodySchema } from "~~/shared/schemas/server/notify";

export default defineEventHandler(async (event) => {
    try {
        const serverId = Number(getRouterParam(event, "id"));
        if (Number.isNaN(serverId)) {
            const apiError = ApiError.validation("参数错误: 无效的服务器ID");
            return createErrorResponse(event, apiError);
        }

        const body = await readBody(event);
        const parsed = notifyPatchBodySchema.safeParse(body);
        if (!parsed.success) {
            const apiError = ApiError.validation("参数错误");
            return createErrorResponse(event, apiError, parsed.error);
        }

        const db = await getDatabase();
        const { notify, targets: items = [] } = parsed.data;

        db.transaction((tx) => {
            const result = tx.update(servers).set({ notifyConfig: notify }).where(eq(servers.id, serverId)).run();
            if (!result || result.changes === 0) {
                throw ApiError.database("更新服务器通知配置失败: 未能找到服务器");
            }

            if (items.length === 0) return;

            const ids = items.map((i) => i.id);

            const exists = tx
                .select()
                .from(targets)
                .where(and(eq(targets.serverId, serverId), inArray(targets.id, ids)))
                .all();

            if (exists.length !== ids.length) {
                const okSet = new Set(exists.map((e) => e.id));
                const invalidIds = ids.filter((x) => !okSet.has(x));
                throw ApiError.validation(`存在与该服务器不匹配或不存在的目标ID: ${invalidIds.join(", ")}`);
            }

            for (const i of items) {
                tx.update(targets)
                    .set({
                        config: i.config,
                        updatedAt: sql`(unixepoch())`
                    })
                    .where(and(eq(targets.id, i.id), eq(targets.serverId, serverId)))
                    .run();
            }
        });

        return createApiResponse(event, "更新服务器通知配置成功", StatusCodes.OK);
    } catch (err: unknown) {
        console.error("更新服务器通知配置失败：", err);
        const apiError = (err as ApiError) || ApiError.internal("更新服务器通知配置失败");
        return createErrorResponse(event, apiError);
    }
});
