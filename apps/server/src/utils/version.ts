import { lt, valid } from "semver";
import packageJson from "~~/package.json";

export const CURRENT_API_VERSION = packageJson.apiVersion;

export const checkClientApiVersion = (
  clientApiVersion: string,
): { warning: string } | null => {
  if (lt(clientApiVersion, CURRENT_API_VERSION)) {
    return {
      warning: `客户端 API 版本 ${clientApiVersion} 低于最低要求版本 ${CURRENT_API_VERSION}，建议更新客户端`,
    };
  }
  return null;
};

export const isValidVersion = (version: string): boolean =>
  valid(version) !== null;
