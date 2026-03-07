import type { Peer } from "crossws";
import { eq, sql, and } from "drizzle-orm";
import moment from "moment-timezone";
import { z } from "zod";
import { db } from "~~/server/db/client";
import { players, playerServers, servers } from "~~/server/db/schema";
import { bindingService } from "~~/server/service/bindingmanager";
import { getConfig } from "~~/server/service/bindingmanager/config";
import { pluginBridge } from "~~/server/service/mcwsbridge/mcws-bridge";
import { MessageHandler } from "~~/server/service/mcwsbridge/message-handler";
import type { RequestHandler } from "~~/server/service/mcwsbridge/request-handler";
import { createJsonRpcRequestSchema } from "~~/server/service/mcwsbridge/types";
import type { JsonRpcRequest } from "~~/server/service/mcwsbridge/types";

import { renderNoBindKick } from "#shared/utils/template/binding";

const joinGameSchema = createJsonRpcRequestSchema(
  z.object({
    ip: z.string().nullable(),
    player: z.string(),
    uuid: z.string(),
  }),
);

export class PlayerLoginHandler implements RequestHandler {
  method = "player.login";

  async handleRequest(request: JsonRpcRequest, peer: Peer): Promise<void> {
    const result = joinGameSchema.safeParse(request);

    if (!result.success) {
      throw new Error("Invalid player login parameters", {
        cause: result.error,
      });
    }

    const { player: playerName, uuid, ip } = result.data.params;

    const serverID = pluginBridge.connectionManager.getServerId(peer);

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
        const formattedTime = moment(bindingResult.expiresAt)
          .tz("Asia/Shanghai")
          .format("YYYY-MM-DD HH:mm:ss");
        const bindKickMsg = renderNoBindKick(
          bindingConfig.nobindkickMsg,
          player.name,
          bindingResult.message,
          formattedTime,
        );
        MessageHandler.sendResponse(peer, request.id, {
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
        MessageHandler.sendResponse(peer, request.id, {
          action: "kick",
          reason: errorMessage,
        });
      }
      return;
    }
    MessageHandler.sendResponse(peer, request.id, { action: "allow" });
  }
}
