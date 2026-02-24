import { ApiError, createErrorResponse } from "#shared/error";
import { PlayerAPI } from "#shared/schemas/player";
import { createApiResponse } from "#shared/types";
import { defineEventHandler } from "h3";
import { StatusCodes } from "http-status-codes";
import { getDatabase } from "~~/server/db/client";

export default defineEventHandler(async (event) => {
  try {
    const database = await getDatabase();

    const playersWithRelations = await database.query.players.findMany({
      with: {
        socialAccount: true,
        playerServers: {
          with: {
            server: true
          }
        }
      }
    });

    const result = playersWithRelations.map((p) => ({
      player: {
        id: p.id,
        uuid: p.uuid,
        name: p.name,
        ip: p.ip,
        socialAccountId: p.socialAccountId,
        createdAt: p.createdAt,
        updatedAt: p.updatedAt
      },
      socialAccount: p.socialAccount ?? null,
      serversName: p.playerServers.map((ps) => ps.server.name)
    }));

    return createApiResponse(event, "获取玩家列表成功", StatusCodes.OK, PlayerAPI.GETS.response.parse(result));
  } catch (err) {
    logger.error({ err }, "Database error");
    return createErrorResponse(event, ApiError.database("获取玩家列表失败"));
  }
});
