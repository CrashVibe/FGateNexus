import dayjs from "dayjs";
import timezone from "dayjs/plugin/timezone";
import utc from "dayjs/plugin/utc";
import { and, eq, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "~~/server/db/client";
import { players, playerServers, servers } from "~~/server/db/schema";
import { bindingService } from "~~/server/service/bindingmanager";
import { getConfig } from "~~/server/service/bindingmanager/config";
import type RequestHandler from "~~/server/service/mcwsbridge/request-handler";
import type { JsonRpcRequest } from "~~/server/service/mcwsbridge/types";
import { createJsonRpcRequestSchema } from "~~/server/service/mcwsbridge/types";

import type ServerSession from "#server/service/mcwsbridge/server-session";
import { renderNoBindKick } from "#shared/utils/template/binding";

dayjs.extend(utc);
dayjs.extend(timezone);

class PlayerLoginHandler implements RequestHandler {
  method = "player.login";

  public readonly joinGameSchema = createJsonRpcRequestSchema(
    z.object({
      ip: z.string().nullable(),
      player: z.string(),
      uuid: z.string(),
    }),
  );

  async handleRequest(
    request: JsonRpcRequest,
    session: ServerSession,
  ): Promise<void> {
    const result = this.joinGameSchema.safeParse(request);
    const serverID = session.serverId;

    if (!result.success) {
      throw new Error("Invalid player login parameters", {
        cause: result.error,
      });
    }

    const { player: playerName, uuid, ip } = result.data.params;

    const server = await db.query.servers.findFirst({
      where: eq(servers.id, serverID),
    });

    if (!server) {
      throw new Error("Server not found");
    }

    // 玩家信息写入
    const [player] = await db
      .insert(players)
      .values({
        ip,
        name: playerName,
        updatedAt: sql`(unixepoch())`,
        uuid,
      })
      .onConflictDoUpdate({
        set: {
          ip,
          name: playerName,
          updatedAt: sql`(unixepoch())`,
        },
        target: players.uuid,
      })
      .returning();

    if (!player) {
      throw new Error("Failed to insert or update player");
    }

    // 是否存在关系
    const existingRelation = await db.query.playerServers.findFirst({
      where: and(
        eq(playerServers.playerId, player.id),
        eq(playerServers.serverId, serverID),
      ),
    });

    if (!existingRelation) {
      await db.insert(playerServers).values({
        playerId: player.id,
        serverId: serverID,
      });
    }

    const bindingConfig = await getConfig(serverID);
    if (bindingConfig.forceBind && player.socialAccountId !== null) {
      try {
        const bindingResult = await bindingService.addPendingBinding(
          serverID,
          player.uuid,
          player.name,
        );
        const formattedTime = dayjs(bindingResult.expiresAt)
          .tz("Asia/Shanghai")
          .format("YYYY-MM-DD HH:mm:ss");
        const bindKickMsg = renderNoBindKick(
          bindingConfig.nobindkickMsg,
          player.name,
          bindingResult.message,
          formattedTime,
        );
        session.sendResponse(request.id, {
          action: "kick",
          reason: bindKickMsg,
        });
        logger.info(
          `[Server #${serverID}] ${player.name} 绑定请求已发送，过期时间：${formattedTime}`,
        );
      } catch (error: unknown) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        logger.error({ errorMessage }, "添加待处理绑定失败");
        session.sendResponse(request.id, {
          action: "kick",
          reason: errorMessage,
        });
      }
      return;
    }
    session.sendResponse(request.id, { action: "allow" });
  }
}

export default PlayerLoginHandler;
