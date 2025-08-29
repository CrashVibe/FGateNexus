import { RequestHandler } from "../RequestHandler";
import type { JsonRpcRequest } from "../types";
import type { AdapterInternal, Peer } from "crossws";
import { pluginBridge } from "../MCWSBridge";
import { getDatabase } from "~~/server/db/client";
import { eq } from "drizzle-orm";
import { servers } from "~~/server/db/schema";
import { chatBridge } from "../../chatbridge/chatbridge";
import { renderDeathMessage } from "~~/shared/utils/template/notify";

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
            console.warn("Invalid player leave params:", request.params);
            return;
        }

        const db = await getDatabase();

        const serverID = pluginBridge.connectionManager.getServerId(peer);
        const server = await db.query.servers.findFirst({
            where: eq(servers.id, serverID),
            with: {
                targets: true
            }
        });
        if (!server) {
            console.warn("Server not found for player leave:", serverID);
            return;
        }
        if (server.notifyConfig.player_disappoint_notify && server.adapterId) {
            const botConnection = chatBridge.getConnectionData(server.adapterId);
            if (!botConnection) return;
            const formattedMessage = renderDeathMessage(
                server.notifyConfig.death_notify_message,
                playerName,
                deathMessage ? deathMessage : "未知原因"
            );
            for (const target of server.targets.filter((t) => t.config.NotifyConfigSchema.enabled)) {
                chatBridge.sendToTarget(botConnection, target.targetId, target.type, formattedMessage);
            }
        }
    }
}
