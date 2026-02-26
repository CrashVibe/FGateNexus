import type { AdapterInternal, Peer } from "crossws";

import { eq } from "drizzle-orm";
import { db } from "~~/server/db/client";
import { servers } from "~~/server/db/schema";
import { renderLeaveMessage } from "~~/shared/utils/template/notify";

import type { JsonRpcRequest } from "../types";

import { chatBridge } from "../../chatbridge/chatbridge";
import { pluginBridge } from "../MCWSBridge";
import { RequestHandler } from "../RequestHandler";

export class PlayerLeaveHandler extends RequestHandler {
  getMethod(): string {
    return "player.leave";
  }

  async handleRequest(request: JsonRpcRequest<{ playerName: string }>, peer: Peer<AdapterInternal>): Promise<void> {
    const { playerName } = request.params || {};

    if (typeof playerName !== "string") {
      logger.warn({ requestParams: request.params }, "无效玩家离开参数");
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
      logger.warn({ serverID }, "玩家离开时未找到服务器");
      return;
    }
    if (server.notifyConfig.player_notify && server.adapterId) {
      const botConnection = chatBridge.getConnectionData(server.adapterId);
      if (!botConnection) return;
      const formattedMessage = renderLeaveMessage(server.notifyConfig.leave_notify_message, playerName);
      for (const target of server.targets.filter((t) => t.config.NotifyConfigSchema.enabled)) {
        await chatBridge.sendToTarget(botConnection, target.targetId, target.type, formattedMessage);
      }
    }
  }
}
