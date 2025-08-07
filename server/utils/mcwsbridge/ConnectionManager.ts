import type { AdapterInternal, Peer } from "crossws";
import { getDatabase } from "~~/server/db/client";
import { servers } from "~~/server/db/schema";
import { eq } from "drizzle-orm";
import { pluginBridge } from "./MCWSBridge";

type ServerConnection = {
    peer: Peer<AdapterInternal>; // 实际连接
    serverId: number; // 对应数据库 id
    data?: GetClientInfoResult;
};

export interface GetClientInfoResult {
    supports_papi: boolean | null;
    supports_rcon: boolean | null;
    player_count: number | null;
}

/**
 * 连接管理器
 * 负责管理所有 WebSocket 连接的生命周期
 */
export class ConnectionManager {
    private connectionMap = new Map<number, ServerConnection>();

    /**
     * 添加连接到管理器
     *
     * @param peer - WebSocket 连接
     * @param serverId - 对应的服务器 ID
     * @throws 如果连接已存在，则抛出错误
     */
    public async addConnection(peer: Peer<AdapterInternal>, serverId: number): Promise<void> {
        if (this.connectionMap.has(serverId)) {
            throw new Error(`该连接已存在，无法重复添加: ${serverId}`);
        }
        this.connectionMap.set(serverId, { peer, serverId });
        try {
            await this.updateClientInfo(peer, serverId);
        } catch (error) {
            console.error(`[ERROR] 更新客户端信息失败: ${peer.id}`, error);
            this.connectionMap.delete(serverId);
            peer.close(1000, "Connection closed due to error");
            throw new Error(`更新客户端信息失败(已关闭连接): ${peer.id}`);
        }
        console.info(`[CONNECTION] 连接已添加: 服务器 ID ${serverId}`);
    }

    /**
     * 检查是否存在连接
     *
     * 两种方式检查连接：
     * - 根据服务器 ID 检查是否存在连接。
     * - 根据 Peer 对象检查是否存在连接。
     *
     * @param serverId - 服务器 ID
     * @param peer - WebSocket 连接
     * @returns 如果存在连接则返回 true，否则返回 false
     * @throws 如果参数无效，则抛出错误
     */
    public hasConnection(peer?: Peer<AdapterInternal>, serverId?: number): boolean {
        if (serverId !== undefined) {
            return this.connectionMap.has(serverId);
        }
        if (peer) {
            for (const connection of this.connectionMap.values()) {
                if (connection.peer === peer) {
                    return true;
                }
            }
            return false;
        }
        throw new Error("必须提供 peer 或 serverId 参数之一");
    }

    /**
     * 移除连接
     *
     * 根据服务器 ID 或 Peer 对象移除连接，并返回对应的服务器 ID。
     *
     * @param peer - WebSocket 连接
     * @param serverID - 服务器 ID
     * @returns 被移除的服务器 ID
     * @throws 如果参数无效或无法找到对应的连接，则抛出错误
     */
    public removeConnection(
        peer?: Peer<AdapterInternal>,
        serverID?: number
    ): { peer: Peer<AdapterInternal>; serverId: number } {
        if (serverID !== undefined) {
            if (this.connectionMap.has(serverID)) {
                const connection = this.connectionMap.get(serverID);
                if (!connection) {
                    throw new Error(`无法找到对应的连接，服务器 ID: ${serverID}`);
                }
                connection.peer.close(1000, "Connection closed by server");
                this.connectionMap.delete(serverID);
                console.info(`[CONNECTION] 连接已移除: 服务器 ID ${serverID}`);
                return { peer: connection.peer, serverId: serverID };
            }
            throw new Error(`无法找到对应的连接，服务器 ID: ${serverID}`);
        }

        if (peer) {
            for (const [serverId, connection] of this.connectionMap.entries()) {
                if (connection.peer === peer) {
                    connection.peer.close(1000, "Connection closed by server");
                    this.connectionMap.delete(serverId);
                    console.info(`[CONNECTION] 连接已移除: 服务器 ID ${serverId}`);
                    return { peer: connection.peer, serverId: serverId };
                }
            }
            throw new Error(`无法找到对应的 peer 连接: ${peer.id}`);
        }

        throw new Error("必须提供 peer 或 serverID 参数之一");
    }

    /**
     * 根据服务器 ID 获取连接
     *
     * @param serverId - 服务器 ID
     * @returns 对应的连接，如果不存在则返回 undefined
     */
    public getConnection(serverId: number): ServerConnection | undefined {
        return this.connectionMap.get(serverId);
    }

    /**
     * 根据 Peer 获取服务器 ID
     *
     * @param peer - WebSocket 连接
     * @returns 对应的服务器 ID，如果不存在则返回 undefined
     */
    public getServerId(peer: Peer<AdapterInternal>): number | undefined {
        for (const [serverId, connection] of this.connectionMap.entries()) {
            if (connection.peer === peer) {
                return serverId;
            }
        }
        return undefined;
    }

    /**
     * 根据服务器 ID 获取连接的 data
     *
     * @param serverId - 服务器 ID
     * @returns 对应的连接的 data，如果不存在则返回 undefined
     */
    public getConnectionData(serverId: number): GetClientInfoResult | undefined {
        const connection = this.connectionMap.get(serverId);
        return connection ? connection.data : undefined;
    }

    /**
     * 获取所有连接
     *
     * @returns 所有连接的数组
     */
    public getAllConnections(): ServerConnection[] {
        return Array.from(this.connectionMap.values());
    }

    /**
     * 获取连接数量
     *
     * @returns 当前连接数量
     */
    public getConnectionCount(): number {
        return this.connectionMap.size;
    }

    /**
     * 更新客户端信息
     */
    private async updateClientInfo(peer: Peer<AdapterInternal>, serverID: number): Promise<GetClientInfoResult> {
        const result = await pluginBridge.sendRequest<{
            data: {
                minecraft_version: string;
                minecraft_software: string;
                supports_papi: boolean;
                supports_rcon: boolean;
                player_count: number;
            };
        }>(peer, "get.client.info");
        if (
            !result.data ||
            typeof result.data.minecraft_version !== "string" ||
            typeof result.data.minecraft_software !== "string" ||
            typeof result.data.supports_papi !== "boolean" ||
            typeof result.data.supports_rcon !== "boolean" ||
            typeof result.data.player_count !== "number"
        ) {
            pluginBridge.sendError(peer, null, -32603, "Invalid client info response", result.data);
            throw new Error(`[WARNING] 客户端信息不完整: ${peer.id}`);
        }

        this.connectionMap.set(serverID, { peer, serverId: serverID, data: result.data });
        // 更新数据库中的服务器信息
        const database = await getDatabase();
        await database
            .update(servers)
            .set({
                minecraft_version: result.data.minecraft_version,
                minecraft_software: result.data.minecraft_software
            })
            .where(eq(servers.id, serverID))
            .execute();

        return result.data;
    }
}
