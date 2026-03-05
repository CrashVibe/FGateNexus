import { defineEventHandler } from "h3";
import { StatusCodes } from "http-status-codes";
import { db } from "~~/server/db/client";

import { ApiError, createErrorResponse } from "#shared/error";
import { PlayerAPI } from "#shared/schemas/player";
import { createApiResponse } from "#shared/types";

export default defineEventHandler(async (event) => {
  try {
    const playersWithRelations = await db.query.players.findMany({
      with: {
        playerServers: {
          with: {
            server: true,
          },
        },
        socialAccount: true,
      },
    });

    const result = playersWithRelations.map((p) => ({
      player: {
        createdAt: p.createdAt,
        id: p.id,
        ip: p.ip,
        name: p.name,
        socialAccountId: p.socialAccountId,
        updatedAt: p.updatedAt,
        uuid: p.uuid,
      },
      serversName: p.playerServers.map((ps) => ps.server.name),
      socialAccount: p.socialAccount ?? null,
    }));

    return createApiResponse(
      event,
      "获取玩家列表成功",
      StatusCodes.OK,
      PlayerAPI.GETS.response.parse(result),
    );
  } catch (error) {
    logger.error({ error }, "Database error");
    return createErrorResponse(event, ApiError.database("获取玩家列表失败"));
  }
});
