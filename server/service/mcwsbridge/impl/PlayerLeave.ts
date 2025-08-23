import { RequestHandler } from "../RequestHandler";
import type { JsonRpcRequest } from "../types";
import type { AdapterInternal, Peer } from "crossws";
import { pluginBridge } from "../MCWSBridge";
import { getDatabase } from "~~/server/db/client";
import { eq } from "drizzle-orm";
import { servers } from "~~/server/db/schema";
import { chatBridge } from "../../chatbridge/chatbridge";
import { renderLeaveMessage } from "~~/shared/utils/template/notify";


export class PlayerLeaveHandler extends RequestHandler {
    getMethod(): string {
        return "player.leave";
    }

    async handleRequest(request: JsonRpcRequest<{ playerName: string }>, peer: Peer<AdapterInternal>): Promise<void> {
        const { playerName } = request.params || {};

        if (typeof playerName !== "string") {
            console.warn("Invalid player leave params:", request.params);
            return;
        }

        const db = await getDatabase();

        const serverID = pluginBridge.connectionManager.getServerId(peer);
        const server = await db.query.servers.findFirst({
            where: eq(servers.id, serverID)
        });
        if (!server) {
            console.warn("Server not found for player leave:", serverID);
            return;
        }
        if (server.notifyConfig.player_notify && server.adapterId) {
            const botConnection = chatBridge.getConnectionData(server.adapterId);
            if (!botConnection) return;
            const formattedMessage = renderLeaveMessage(server.notifyConfig.leave_notify_message, playerName);
            for (const target of server.notifyConfig.targets) {
                chatBridge.sendToTarget(botConnection, target.groupId, target.type, formattedMessage);
            }
        }
    }
}
