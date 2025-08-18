import { type ChatSyncConfig, chatSyncConfigSchema } from "../schemas/server/chatSync";

/**
 * 获取默认聊天同步配置
 */
export function getDefaultChatSyncConfig(): ChatSyncConfig {
    return chatSyncConfigSchema.parse({});
}

export function formatPlatformToMCMessage(
    msg: string,
    data: { platform: string; nickname: string; userId: string; message: string; timestamp: number }
): string {
    return msg
        .replace("{platform}", data.platform)
        .replace("{nickname}", data.nickname)
        .replace("{userId}", data.userId)
        .replace("{message}", data.message)
        .replace("{timestamp}", new Date(data.timestamp).toLocaleString());
}

export function formatMCToPlatformMessage(
    msg: string,
    data: {
        playerName: string;
        playerUUID: string;
        message: string;
        serverName: string;
        timestamp: number;
    }
): string {
    return msg
        .replace("{serverName}", data.serverName)
        .replace("{playerName}", data.playerName)
        .replace("{playerUUID}", data.playerUUID)
        .replace("{message}", data.message)
        .replace("{timestamp}", new Date(data.timestamp).toLocaleString());
}
