import type { AdapterInternal, Peer } from "crossws";
import type { GetClientInfoResult } from "./ConnectionManager";
import { ConnectionManager } from "./ConnectionManager";
import { MessageHandler } from "./MessageHandler";

/**
 * Minecraft WebSocket 桥接器
 * 作为协调器，统一管理连接和消息处理
 */
class MCWSBridge {
    static instance: MCWSBridge | null = null;

    private connectionManager: ConnectionManager;
    private messageHandler: MessageHandler;

    private constructor() {
        this.connectionManager = new ConnectionManager();
        this.messageHandler = new MessageHandler();
    }

    /**
     * 获取 MCWSBridge 实例
     *
     * @returns MCWSBridge 实例
     */
    public static getInstance() {
        if (!MCWSBridge.instance) {
            MCWSBridge.instance = new MCWSBridge();
        }
        return MCWSBridge.instance;
    }

    /**
     * 添加连接到桥接
     *
     * @param peer - WebSocket 连接
     * @param serverId - 对应的服务器 ID
     * @throws 如果连接已存在，则抛出错误
     */
    public addConnection(peer: Peer<AdapterInternal>, serverId: number): void {
        this.connectionManager.addConnection(peer, serverId);
    }

    /**
     * 检查是否存在连接
     *
     * @param peer - WebSocket 连接
     * @param serverId - 服务器 ID
     * @returns 如果存在连接则返回 true，否则返回 false
     */
    public hasConnection(peer?: Peer<AdapterInternal>, serverId?: number): boolean {
        return this.connectionManager.hasConnection(peer, serverId);
    }

    /**
     * 移除连接
     *
     * @param peer - WebSocket 连接
     * @param serverID - 服务器 ID
     * @returns 被移除的服务器 ID
     */
    public removeConnection(
        peer?: Peer<AdapterInternal>,
        serverID?: number
    ): { peer: Peer<AdapterInternal>; serverId: number } {
        const data = this.connectionManager.removeConnection(peer, serverID);
        this.messageHandler.cleanupByPeer(data.peer.id);
        return data;
    }

    /**
     * 处理 WebSocket 消息
     *
     * @param peer - WebSocket 连接
     * @param message - 收到的消息
     */
    public async handleMessage(peer: Peer<AdapterInternal>, message: string): Promise<void> {
        await this.messageHandler.handleMessage(peer, message);
    }

    /**
     * 发送请求并等待响应
     *
     * @param peer - WebSocket 连接
     * @param method - 请求方法
     * @param params - 请求参数
     * @returns Promise 返回响应结果
     */
    public sendRequest<T = unknown, P = unknown>(peer: Peer<AdapterInternal>, method: string, params?: P): Promise<T> {
        return this.messageHandler.sendRequest<T, P>(peer, method, params);
    }

    /**
     * 发送成功响应
     *
     * @param peer - WebSocket 连接
     * @param id - 请求 ID
     * @param result - 响应结果
     */
    public sendResponse(peer: Peer<AdapterInternal>, id: string | null, result?: unknown): void {
        this.messageHandler.sendResponse(peer, id, result);
    }

    /**
     * 发送错误响应
     *
     * @param peer - WebSocket 连接
     * @param id - 请求 ID
     * @param code - 错误代码
     * @param message - 错误消息
     * @param data - 附加数据
     */
    public sendError(
        peer: Peer<AdapterInternal>,
        id: string | null,
        code: number,
        message: string,
        data?: unknown
    ): void {
        this.messageHandler.sendError(peer, id, code, message, data);
    }

    /**
     * 根据服务器 ID 获取连接
     *
     * @param serverId - 服务器 ID
     * @returns 对应的连接信息
     */
    public getConnection(serverId: number) {
        return this.connectionManager.getConnection(serverId);
    }

    /**
     * 根据 Peer 获取服务器 ID
     *
     * @param peer - WebSocket 连接
     * @returns 对应的服务器 ID
     */
    public getServerId(peer: Peer<AdapterInternal>): number | undefined {
        return this.connectionManager.getServerId(peer);
    }

    /**
     * 获取连接数量
     *
     * @returns 当前连接数量
     */
    public getConnectionCount(): number {
        return this.connectionManager.getConnectionCount();
    }

    /**
     * 获取待处理请求数量
     *
     * @returns 待处理请求数量
     */
    public getPendingRequestCount(): number {
        return this.messageHandler.getPendingRequestCount();
    }

    /**
     * 根据服务器 ID 获取连接的 data
     *
     * @param serverId - 服务器 ID
     * @returns 对应的连接的 data，如果不存在则返回 undefined
     */
    public getConnectionData(serverId: number): GetClientInfoResult | undefined {
        return this.connectionManager.getConnectionData(serverId);
    }
}

export const pluginBridge = MCWSBridge.getInstance();
