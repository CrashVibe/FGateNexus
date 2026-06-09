import { Hono } from "hono";
import { StatusCodes } from "http-status-codes";

import { db } from "#server/db/client";
import { guard, ok } from "#server/http/respond";
import { PlayerAPI } from "#shared/model/player/api";

export const playersRouter = new Hono().get(
  "/",
  guard("获取玩家列表失败", async (c) => {
    const playersWithRelations = await db.query.playerTable.findMany({
      with: {
        playerServers: { with: { server: true } },
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

    return ok(
      c,
      "获取玩家列表成功",
      StatusCodes.OK,
      PlayerAPI.GETS.response.parse(result),
    );
  }),
);
