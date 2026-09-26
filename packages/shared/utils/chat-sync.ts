import type { ChatSyncConfig } from "#shared/model/server/schema/chat-sync";

export const formatPlatformToMCMessage = (
  msg: string,
  data: {
    platform: string;
    nickname: string;
    userId: string;
    message: string;
    timestamp: number;
  },
): string =>
  msg
    .replace("{platform}", data.platform)
    .replace("{nickname}", data.nickname)
    .replace("{userId}", data.userId)
    .replace("{message}", data.message)
    .replace("{timestamp}", new Date(data.timestamp).toLocaleString());

export const formatMCToPlatformMessage = (
  msg: string,
  data: {
    playerName: string;
    playerUUID: string;
    message: string;
    serverName: string;
    timestamp: number;
  },
): string =>
  msg
    .replace("{serverName}", data.serverName)
    .replace("{playerName}", data.playerName)
    .replace("{playerUUID}", data.playerUUID)
    .replace("{message}", data.message)
    .replace("{timestamp}", new Date(data.timestamp).toLocaleString());

/** null = 放行 */
export const getFilterReason = (
  message: string,
  config: ChatSyncConfig,
): string | null => {
  const { filters } = config;
  if (message.length < filters.minMessageLength) {
    return `太短了（少于 ${filters.minMessageLength} 字）`;
  }
  if (message.length > filters.maxMessageLength) {
    return `太长了（超过 ${filters.maxMessageLength} 字）`;
  }

  const safeTest = (regex: string, flags: string): boolean => {
    try {
      return new RegExp(regex, flags).test(message);
    } catch {
      return false;
    }
  };

  if (filters.filterMode === "whitelist") {
    const pass =
      filters.whitelistPrefixes.some((prefix) => message.startsWith(prefix)) ||
      filters.whitelistRegex.some((regex) => safeTest(regex, "u"));
    return pass ? null : "不符合白名单前缀或正则";
  }

  const keyword = filters.blacklistKeywords.find((k) =>
    message.toLowerCase().includes(k.toLowerCase()),
  );
  if (keyword !== undefined) {
    return `命中屏蔽词「${keyword}」`;
  }
  const regex = filters.blacklistRegex.find((r) => safeTest(r, "iu"));
  if (regex !== undefined) {
    return `命中屏蔽正则 /${regex}/`;
  }
  return null;
};
