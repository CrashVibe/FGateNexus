import type { ChatSyncConfig } from "../schemas/server/chatSync";

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

/**
 * 检查消息是否应该被转发
 * @param message 要检查的消息内容
 * @param config 聊天同步配置
 * @returns 是否应该转发该消息
 */
export function shouldForwardMessage(message: string, config: ChatSyncConfig): boolean {
  const { filters } = config;

  if (config.enabled === false) return false;

  // 消息长度
  if (message.length < filters.minMessageLength || message.length > filters.maxMessageLength) {
    return false;
  }

  if (filters.filterMode === "blacklist") {
    // 黑名单模式：检查是否包含黑名单关键词或匹配正则表达式
    if (filters.blacklistKeywords.some((keyword) => message.toLowerCase().includes(keyword.toLowerCase()))) {
      return false;
    }
    if (
      filters.blacklistRegex.some((regex) => {
        try {
          return new RegExp(regex, "i").test(message);
        } catch {
          return false;
        }
      })
    ) {
      return false;
    }
    return true;
  } else if (filters.filterMode === "whitelist") {
    // 白名单模式：检查是否以指定前缀开头或匹配正则表达式
    const hasPrefix = filters.whitelistPrefixes.some((prefix) => message.startsWith(prefix));
    const hasRegexMatch = filters.whitelistRegex.some((regex) => {
      try {
        return new RegExp(regex).test(message);
      } catch {
        return false;
      }
    });
    return hasPrefix || hasRegexMatch;
  }

  // 默认黑名单模式
  return true;
}
