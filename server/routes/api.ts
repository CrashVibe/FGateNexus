import { getDatabase } from "~~/server/db/client";
import { servers } from "../db/schema";
import { eq } from "drizzle-orm";
import type { AdapterInternal, Peer } from "crossws";
import { pluginBridge } from "../service/mcwsbridge/MCWSBridge";

export default defineWebSocketHandler({
    async open(peer) {
        const token = peer.request.headers.get("authorization")?.replace("Bearer ", "");
        const clientVersion = peer.request.headers.get("x-api-version");

        if (!token || !clientVersion) {
            peer.close(1008, "Unauthorized: Missing authorization token");
            console.warn("WebSocket 请求缺失 Token 或 版本号：", {
                token,
                clientVersion
            });
            return;
        }

        const database = await getDatabase();
        const db_token = await database.select().from(servers).where(eq(servers.token, token)).limit(1);
        if (db_token.length === 0) {
            peer.close(1008, "Unauthorized: Invalid authorization token");
            console.warn("WebSocket 请求 Token 无效：", {
                token
            });
            return;
        }

        const server = db_token[0];
        if (!server) {
            peer.close(1008, "Unauthorized: Invalid server data");
            console.warn("WebSocket 请求服务器数据无效");
            return;
        }

        if (pluginBridge.hasConnection(undefined, server.id)) {
            peer.close(1008, "Unauthorized: Connection already exists");
            console.warn("WebSocket 接受的对应连接连接已存在：", {
                serverId: server.id
            });
            return;
        }

        pluginBridge.addConnection(peer as unknown as Peer<AdapterInternal>, server.id);

        peer.send(
            JSON.stringify({
                type: "welcome",
                message: "连接成功，欢迎使用 FGATE",
                api_version: "0.0.1"
            })
        );

        console.info("WebSocket 接受请求成功：", {
            serverId: server.id,
            clientVersion
        });
    },

    async close(peer) {
        if (pluginBridge.hasConnection(peer as unknown as Peer<AdapterInternal>)) {
            const data = pluginBridge.removeConnection(peer as unknown as Peer<AdapterInternal>);
            console.info("WebSocket 连接已移除：", {
                peerId: peer.id,
                serverId: data.serverId
            });
            return;
        }
        console.info("WebSocket 连接已关闭：", {
            peerId: peer.id
        });
    },
    async message(peer, message) {
        if (!pluginBridge.hasConnection(peer as unknown as Peer<AdapterInternal>)) {
            throw new Error("Unauthorized: 该连接未授权或不存在");
        }
        await pluginBridge.handleMessage(peer as unknown as Peer<AdapterInternal>, message.text());
    }
});
