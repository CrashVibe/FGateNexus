import type { AdapterInternal, Peer } from "crossws";
import type { MCWSBridge } from "./MCWSBridge";

/**
 * 服务器连接信息
 */
export type ServerConnection = {
    /**
     * 实际连接
     */
    peer: Peer<AdapterInternal>;
    /**
     * 服务器的 id
     *
     * 服务器在数据库中的 ID
     */
    serverId: number;
    /**
     * 客户端信息
     */
    data?: GetClientInfoResult;
};

/**
 * 获取客户端信息的结果
 *
 * 包含客户端支持的功能和玩家数量等信息
 */
export interface GetClientInfoResult {
    /**
     * 是否支持 PAPI
     */
    supports_papi: boolean | null;
    /**
     * 是否支持 Command
     */
    supports_command: boolean | null;
    /**
     * 玩家数量
     */
    player_count: number | null;
}

/**
 * 连接管理器
 * 负责管理所有 WebSocket 连接的生命周期
 */
export class ConnectionManager {
    private connectionMap = new Map<number, ServerConnection>();
    constructor(private bridge: MCWSBridge) {
        this.bridge = bridge;
    }
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
            await this.bridge.updateClientInfo(peer, serverId);
        } catch (error) {
            logger.error({ error }, `[ERROR] 更新客户端信息失败: ${peer.id}`);
            this.bridge.connectionManager.removeConnection(undefined, serverId);
            peer.close(1000, "Connection closed due to error");
            throw new Error(`更新客户端信息失败(已关闭连接): ${peer.id}`);
        }
        logger.info(`[CONNECTION] 连接已添加: 服务器 ID ${serverId}`);
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
                logger.info(`[CONNECTION] 连接已移除: 服务器 ID ${serverID}`);
                this.bridge.messageHandler.cleanupByPeer(connection.peer.id);
                return { peer: connection.peer, serverId: serverID };
            }
            throw new Error(`无法找到对应的连接，服务器 ID: ${serverID}`);
        }

        if (peer) {
            for (const [serverId, connection] of this.connectionMap.entries()) {
                if (connection.peer === peer) {
                    connection.peer.close(1000, "Connection closed by server");
                    this.connectionMap.delete(serverId);
                    logger.info(`[CONNECTION] 连接已移除: 服务器 ID ${serverId}`);
                    this.bridge.messageHandler.cleanupByPeer(peer.id);
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
    public getConnection(serverId: number): ServerConnection {
        const connection = this.connectionMap.get(serverId);
        if (!connection) {
            throw new Error(`无法找到对应的连接，服务器 ID: ${serverId}`);
        }
        return connection;
    }

    /**
     * 根据 Peer 获取服务器 ID
     *
     * @param peer - WebSocket 连接
     * @returns 对应的服务器 ID
     */
    public getServerId(peer: Peer<AdapterInternal>): number {
        for (const [serverId, connection] of this.connectionMap.entries()) {
            if (connection.peer === peer) {
                return serverId;
            }
        }
        throw new Error(`无法找到对应的 peer 连接: ${peer.id}`);
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
     * 设置连接的 data
     *
     * @param serverId - 服务器 ID
     * @param data - 要设置的连接数据
     */
    public setConnectionData(serverId: number, data: ServerConnection): void {
        if (!this.connectionMap.has(serverId)) {
            throw new Error(`无法找到对应的连接，服务器 ID: ${serverId}`);
        }
        this.connectionMap.set(serverId, data);
        logger.info(`[CONNECTION] 连接数据已更新: 服务器 ID ${serverId}`);
    }
}
