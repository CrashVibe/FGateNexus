import { defineEventHandler } from "h3";
import { getDatabase } from "~~/server/db/client";
import { players, playerServers, servers, socialAccounts } from "~~/server/db/schema";
import { createApiResponse } from "#shared/types";
import { ApiError, createErrorResponse } from "#shared/error";
import type { PlayerWithRelations } from "#shared/schemas/player";
import { StatusCodes } from "http-status-codes";

export default defineEventHandler(async (event) => {
    try {
        const database = await getDatabase();
        const [playersRes, socialRes, playerServersRes, serversRes] = await Promise.all([
            database.select().from(players),
            database.select().from(socialAccounts),
            database.select().from(playerServers),
            database.select().from(servers)
        ]);

        // 构建社交账号映射
        const socialMap = new Map<number, (typeof socialRes)[0]>();
        for (const s of socialRes) socialMap.set(s.id, s);

        // 构建服务器映射
        const serverMap = new Map<number, (typeof serversRes)[0]>();
        for (const s of serversRes) serverMap.set(s.id, s);

        // 构建玩家与服务器关系映射
        const playerServerMap = new Map<number, (typeof serversRes)[0][]>();
        for (const ps of playerServersRes) {
            if (!playerServerMap.has(ps.playerId)) playerServerMap.set(ps.playerId, []);
            const server = serverMap.get(ps.serverId);
            if (server) playerServerMap.get(ps.playerId)!.push(server);
        }

        // 组装结果并扩充数据量（测试用）
        const result: PlayerWithRelations[] = playersRes.map((p) => ({
            player: p,
            socialAccount: typeof p.socialAccountId === "number" ? (socialMap.get(p.socialAccountId) ?? null) : null,
            servers: playerServerMap.get(p.id) ?? []
        }));

        return createApiResponse(event, "获取玩家列表成功", StatusCodes.OK, result);
    } catch (err) {
        logger.error({ err }, "Database error");
        return createErrorResponse(event, ApiError.database("获取玩家列表失败"));
    }
});
