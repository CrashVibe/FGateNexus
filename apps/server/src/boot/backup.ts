import fs from "node:fs/promises";
import path from "node:path";

import { logger } from "#server/utils/logger";

// ponytail: 靠系统 tar（Linux/macOS/Win10+ 自带），不引打包库
const PENDING = path.join("data", "restore-pending.tar.gz");
const ALLOWED = /^\.\/(?:data(?:\/|$)|config(?:\/|$)|$)/u;

const run = async (cmd: string[], stdin?: Blob): Promise<ArrayBuffer> => {
  const proc = Bun.spawn(cmd, { stderr: "pipe", stdin: stdin ?? "ignore" });
  const [out, err, code] = await Promise.all([
    new Response(proc.stdout).arrayBuffer(),
    new Response(proc.stderr).text(),
    proc.exited,
  ]);
  if (code !== 0) {
    throw new Error(`${cmd[0]} 失败：${err.trim()}`);
  }
  return out;
};

/** DB 用 VACUUM INTO 拿一致快照 */
export const createBackup = async (
  vacuumInto: (file: string) => void,
): Promise<ArrayBuffer> => {
  const staging = await fs.mkdtemp(path.join("data", ".backup-"));
  try {
    await fs.mkdir(path.join(staging, "data"), { recursive: true });
    vacuumInto(path.join(staging, "data", "sqlite.db"));
    await fs
      .cp(
        path.join("data", "templates"),
        path.join(staging, "data", "templates"),
        { recursive: true },
      )
      .catch(() => null); // 没装过模板
    await fs.cp("config", path.join(staging, "config"), { recursive: true });
    return await run(["tar", "-czf", "-", "-C", staging, "."]);
  } finally {
    await fs.rm(staging, { force: true, recursive: true });
  }
};

/** 暂存，下次启动再恢复：运行中换不了库 */
export const stageRestore = async (file: Blob): Promise<void> => {
  const listing = new TextDecoder().decode(
    await run(["tar", "-tzf", "-"], file),
  );
  const entries = listing
    .split("\n")
    .filter(Boolean)
    .map((e) => (e.startsWith("./") ? e : `./${e}`));
  if (!entries.includes("./data/sqlite.db")) {
    throw new Error("这不是 FGate 的备份包（缺少 data/sqlite.db）");
  }
  const bad = entries.find((e) => !ALLOWED.test(e) || e.includes(".."));
  if (bad) {
    throw new Error(`备份包里有不该出现的路径：${bad}`);
  }
  await Bun.write(PENDING, file);
};

export const applyPendingRestore = async (): Promise<void> => {
  if (!(await Bun.file(PENDING).exists())) {
    return;
  }
  const db = path.join("data", "sqlite.db");
  const bak = `${db}.bak-${Date.now()}`;
  // WAL/SHM 跟着旧库走，否则既污染新库又丢旧库未落盘的写入
  for (const suffix of ["", "-wal", "-shm"]) {
    await fs.rename(db + suffix, bak + suffix).catch(() => null);
  }
  await run(["tar", "-xzf", PENDING, "-C", "."]);
  await fs.rm(PENDING);
  logger.info("已从备份恢复数据，旧数据库留在 data/sqlite.db.bak-*");
};
