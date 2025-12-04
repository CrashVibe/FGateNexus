import type { AdapterInternal, Peer } from "crossws";
import { eq, sql } from "drizzle-orm";
import moment from "moment-timezone";
import { getDatabase } from "~~/server/db/client";
import { players, playerServers, servers } from "~~/server/db/schema";
import { renderNoBindKick } from "~~/shared/utils/template/binding";
import { bindingService } from "../../bindingmanager";
import { getConfig } from "../../bindingmanager/config";
import { pluginBridge } from "../MCWSBridge";
import { RequestHandler } from "../RequestHandler";
import type { JsonRpcRequest } from "../types";

export class PlayerLoginHandler extends RequestHandler {
    getMethod(): string {
        return "player.login";
    }

    async handleRequest(
        request: JsonRpcRequest<{ player: string; uuid: string; ip: string | null }>,
        peer: Peer<AdapterInternal>
    ): Promise<void> {
        const { player: playerName, uuid, ip } = request.params || {};
        if (
            typeof playerName !== "string" ||
            typeof uuid !== "string" ||
            (ip === null ? false : typeof ip !== "string")
        ) {
            throw new Error("Invalid params: player, uuid and ip are required");
        }
        const database = await getDatabase();

        const serverID = pluginBridge.connectionManager.getServerId(peer);

        const server = await database.query.servers.findFirst({
            where: eq(servers.id, serverID)
        });

        if (!server) {
            throw new Error("Server not found");
        }

        // 玩家信息写入
        const [player] = await database
            .insert(players)
            .values({
                uuid,
                name: playerName,
                ip,
                updatedAt: sql`(unixepoch())`
            })
            .onConflictDoUpdate({
                target: players.uuid,
                set: {
                    name: playerName,
                    ip,
                    updatedAt: sql`(unixepoch())`
                }
            })
            .returning();

        if (!player) {
            throw new Error("Failed to insert or update player");
        }

        // 是否存在关系
        const existingRelation = await database
            .select()
            .from(playerServers)
            .where(eq(playerServers.playerId, player.id) && eq(playerServers.serverId, serverID))
            .limit(1);

        if (existingRelation.length === 0) {
            await database.insert(playerServers).values({
                playerId: player.id,
                serverId: serverID
            });
        }

        const bindingConfig = await getConfig(serverID);
        if (bindingConfig.forceBind && !player.socialAccountId) {
            try {
                const bindingResult = await bindingService.addPendingBinding(serverID, player.uuid, player.name);
                const formattedTime = moment(bindingResult.expiresAt).tz("Asia/Shanghai").format("YYYY-MM-DD HH:mm:ss");
                const bindKickMsg = renderNoBindKick(
                    bindingConfig.nobindkickMsg,
                    player.name,
                    bindingResult.message,
                    formattedTime
                );
                this.sendResponse(peer, request.id, { action: "kick", reason: bindKickMsg });
                logger.info(`[Server #${serverID}] ${player.name} 绑定请求已发送，过期时间: ${formattedTime}`);
            } catch (error: unknown) {
                const errorMessage = error instanceof Error ? error.message : String(error);
                logger.error({ errorMessage }, "添加待处理绑定失败");
                this.sendResponse(peer, request.id, { action: "kick", reason: errorMessage });
            }
            return;
        }
        this.sendResponse(peer, request.id, { action: "allow" });
    }
}
