import {
  deleteStatusBefore,
  insertStatusSample,
} from "#server/db/queries/server-status-history";
import { connectionManager } from "#server/service/mcwsbridge/connection-manager";
import { registerCleanup } from "#server/utils/cleanup-registry";
import { logger } from "#server/utils/logger";

const INTERVAL_MS = 60_000;
const RETENTION_MS = 7 * 24 * 60 * 60 * 1000;
/** 无需每次采集都清理 */
const PURGE_INTERVAL_MS = 60 * 60 * 1000;

const log = logger.child({}, { msgPrefix: "[StatusCollector] " });

let timer: ReturnType<typeof setInterval> | null = null;
let running = false;
let lastPurgeAt = 0;

const collectOnce = async (): Promise<void> => {
  if (running) {
    return; // 避免上一轮叠加
  }
  running = true;
  try {
    for (const session of connectionManager.getAllConnections()) {
      if (!session.capabilities.server_status) {
        continue;
      }
      try {
        const status = await session.getServerStatus();
        if (status) {
          await insertStatusSample(session.serverId, {
            mspt: status.mspt ?? null,
            online: status.online,
            tps: status.tps ?? null,
          });
        }
      } catch (error) {
        log.warn(error, `采集服务器 ${session.serverId} 状态失败`);
      }
    }
    if (Date.now() - lastPurgeAt >= PURGE_INTERVAL_MS) {
      await deleteStatusBefore(new Date(Date.now() - RETENTION_MS));
      lastPurgeAt = Date.now();
    }
  } catch (error) {
    log.error(error, "状态采集轮次异常");
  } finally {
    running = false;
  }
};

export const startStatusCollector = (): void => {
  if (timer) {
    return;
  }
  timer = setInterval(() => void collectOnce(), INTERVAL_MS);
  registerCleanup("status-collector", () => {
    if (timer) {
      clearInterval(timer);
      timer = null;
    }
  });
  log.info("状态采集已启动（间隔 60s）");
};
