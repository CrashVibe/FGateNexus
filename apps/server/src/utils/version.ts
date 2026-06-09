import { lt, valid } from "semver";
import packageJson from "~~/package.json";

export const CURRENT_API_VERSION = packageJson.apiVersion;
export const MINIMUM_CLIENT_VERSION = packageJson.minimumClientVersion;

export const checkClientVersion = (
  clientVersion: string,
): { warning: string } | null => {
  if (lt(clientVersion, MINIMUM_CLIENT_VERSION)) {
    return {
      warning: `客户端版本 ${clientVersion} 低于最低要求版本 ${MINIMUM_CLIENT_VERSION}，建议更新客户端`,
    };
  }
  return null;
};

export const isValidVersion = (version: string): boolean =>
  valid(version) !== null;
