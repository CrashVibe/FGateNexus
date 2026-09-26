import { gt, valid } from "semver";
import packageJson from "~~/package.json";

import { logger } from "#server/utils/logger";
import type { VersionInfo } from "#shared/model/settings";

const RELEASES =
  "https://api.github.com/repos/CrashVibe/FGateNexus/releases?per_page=1";
const CACHE_MS = 60 * 60 * 1000;

let cache: { at: number; info: VersionInfo } | null = null;

/** 当前版本 + GitHub 最新 release（含预发布，一小时查一次；查不到就当没更新） */
export const getVersionInfo = async (): Promise<VersionInfo> => {
  if (cache && Date.now() - cache.at < CACHE_MS) {
    return cache.info;
  }
  const current = packageJson.version;
  let latest: VersionInfo["latest"] = null;
  try {
    const res = await fetch(RELEASES, { signal: AbortSignal.timeout(5000) });
    const [release] = (await res.json()) as {
      tag_name: string;
      html_url: string;
    }[];
    const version = release ? valid(release.tag_name) : null;
    if (release && version) {
      latest = { url: release.html_url, version };
    }
  } catch (error) {
    logger.warn(error, "[UpdateCheck] 检查更新失败");
  }
  const info: VersionInfo = {
    current,
    hasUpdate: latest !== null && gt(latest.version, current),
    latest,
  };
  cache = { at: Date.now(), info };
  return info;
};
