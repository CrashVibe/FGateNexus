import { ApiError, createErrorResponse } from "#shared/error";
import { createApiResponse } from "#shared/types";
import { and, eq, inArray, sql } from "drizzle-orm";
import { defineEventHandler, getRouterParam, readBody } from "h3";
import { StatusCodes } from "http-status-codes";
import { getDatabase } from "~~/server/db/client";
import { servers, targets } from "~~/server/db/schema";
import { commandPatchBodySchema } from "~~/shared/schemas/server/command";

export default defineEventHandler(async (event) => {
    try {
        const serverID = Number(getRouterParam(event, "id"));
        if (Number.isNaN(serverID)) {
            const apiError = ApiError.validation("参数错误: 无效的服务器ID");
            return createErrorResponse(event, apiError);
        }

        const body = await readBody(event);
        const parsed = commandPatchBodySchema.safeParse(body);
        if (!parsed.success) {
            const apiError = ApiError.validation("参数错误");
            return createErrorResponse(event, apiError, parsed.error);
        }

        const db = await getDatabase();
        const { command, targets: items = [] } = parsed.data;

        db.transaction((tx) => {
            tx.update(servers).set({ commandConfig: command }).where(eq(servers.id, serverID)).run();

            if (items.length === 0) return;

            const ids = items.map((i) => i.id);

            const exists = tx
                .select()
                .from(targets)
                .where(and(eq(targets.serverId, serverID), inArray(targets.id, ids)))
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
                    .where(and(eq(targets.id, i.id), eq(targets.serverId, serverID)))
                    .run();
            }
        });

        return createApiResponse(event, "更新服务器指令配置成功", StatusCodes.OK);
    } catch (err: unknown) {
        logger.error({ err }, "更新服务器指令配置失败");
        const apiError = (err as ApiError) || ApiError.internal("更新服务器指令配置失败");
        return createErrorResponse(event, apiError);
    }
});
