import type { AdapterInternal, Peer } from "crossws";

import { eq } from "drizzle-orm";
import { db } from "~~/server/db/client";
import { servers } from "~~/server/db/schema";
import { renderDeathMessage } from "~~/shared/utils/template/notify";

import type { JsonRpcRequest } from "../types";

import { chatBridge } from "../../chatbridge/chatbridge";
import { pluginBridge } from "../MCWSBridge";
import { RequestHandler } from "../RequestHandler";

export class PlayerDeathHandler extends RequestHandler {
  getMethod(): string {
    return "player.death";
  }

  async handleRequest(
    request: JsonRpcRequest<{ playerName: string; deathMessage?: string }>,
    peer: Peer<AdapterInternal>
  ): Promise<void> {
    const { playerName, deathMessage } = request.params || {};

    if (typeof playerName !== "string") {
      logger.warn({ requestParams: request.params }, "玩家死亡时参数无效");
      return;
    }

    const serverID = pluginBridge.connectionManager.getServerId(peer);
    const server = await db.query.servers.findFirst({
      where: eq(servers.id, serverID),
      with: {
        targets: true
      }
    });
    if (!server) {
      logger.warn({ serverID }, "玩家死亡时未找到服务器");
      return;
    }
    if (server.notifyConfig.player_disappoint_notify && server.adapterId) {
      const botConnection = chatBridge.getConnectionData(server.adapterId);
      if (!botConnection) return;
      const formattedMessage = renderDeathMessage(
        server.notifyConfig.death_notify_message,
        playerName,
        deathMessage || "未知原因"
      );
      for (const target of server.targets.filter((t) => t.config.NotifyConfigSchema.enabled)) {
        await chatBridge.sendToTarget(botConnection, target.targetId, target.type, formattedMessage);
      }
    }
  }
}
