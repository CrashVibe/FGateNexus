import packageJson from "~~/package.json";

export const CURRENT_API_VERSION = packageJson.apiVersion;
export const MINIMUM_CLIENT_VERSION = packageJson.minimumClientVersion;

export const compareVersions = (v1: string, v2: string): number => {
  const parts1 = v1.split(".").map(Number);
  const parts2 = v2.split(".").map(Number);
  const maxLength = Math.max(parts1.length, parts2.length);
  for (let i = 0; i < maxLength; i += 1) {
    const part1 = parts1[i] ?? 0;
    const part2 = parts2[i] ?? 0;
    if (part1 < part2) {
      return -1;
    }
    if (part1 > part2) {
      return 1;
    }
  }

  return 0;
};

/**
 * 检查客户端版本是否满足最低要求
 * @returns 如果版本低于最低要求，返回警告信息；否则返回 null
 */
export const checkClientVersion = (
  clientVersion: string,
): { warning: string } | null => {
  const comparisonResult = compareVersions(
    clientVersion,
    MINIMUM_CLIENT_VERSION,
  );

  if (comparisonResult < 0) {
    return {
      warning: `客户端版本 ${clientVersion} 低于最低要求版本 ${MINIMUM_CLIENT_VERSION}，建议更新客户端`,
    };
  }

  return null;
};

/**
 * 验证版本格式
 */
export const isValidVersion = (version: string): boolean => {
  const versionRegex = /^\d+\.\d+\.\d+$/;
  return versionRegex.test(version);
};
