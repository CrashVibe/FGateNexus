import { useQueryClient } from "@tanstack/react-query";
import { differenceWith, isEqual, pick } from "lodash-es";
import type { Dispatch, SetStateAction } from "react";
import { useEffect, useMemo, useRef, useState } from "react";

import type { ServerWithStatus } from "#shared/model/server/schema/servers";
import type { targetResponse } from "#shared/model/server/schema/target";
import type { AutoSaveStatus } from "@/hooks/use-auto-save";
import { useAutoSaveTrigger } from "@/hooks/use-auto-save";
import { useServer } from "@/queries/servers";
import { targetsKey } from "@/queries/targets";

/**
 * 「配置 + 目标」类服务器子页面（远程指令 / 事件通知 / 消息互通）的共用表单状态：
 * 拉服务器数据 → 本地副本 → 脏检测 → 防抖自动保存 → 刷新缓存。
 * config 为 null 表示尚未加载完成。
 */
export const useServerConfigForm = <TConfig>(
  serverId: number,
  select: (server: ServerWithStatus) => TConfig,
  /** changedTargets 只含改动过的目标，服务端按 id 增量更新。 */
  save: (
    config: TConfig,
    changedTargets: Pick<targetResponse, "config" | "id">[],
  ) => Promise<void>,
): {
  config: TConfig | null;
  setConfig: Dispatch<SetStateAction<TConfig>>;
  targets: targetResponse[];
  setTargets: Dispatch<SetStateAction<targetResponse[]>>;
  status: AutoSaveStatus;
} => {
  const queryClient = useQueryClient();
  const { data: server, refetch } = useServer(serverId);

  const [config, setConfig] = useState<TConfig | null>(null);
  const [targets, setTargets] = useState<targetResponse[]>([]);
  const [original, setOriginal] = useState<{
    config: TConfig;
    targets: targetResponse[];
  } | null>(null);

  // select 在 useEffect 中调用，用 ref 取最新值。
  const selectRef = useRef(select);
  selectRef.current = select;

  useEffect(() => {
    if (!server) {
      return;
    }
    const next = selectRef.current(server);
    setConfig(next);
    setTargets(server.targets);
    setOriginal({
      config: structuredClone(next),
      targets: structuredClone(server.targets),
    });
  }, [server]);

  const isDirty = useMemo(
    () =>
      original !== null &&
      config !== null &&
      !isEqual({ config, targets }, original),
    [config, targets, original],
  );

  const status = useAutoSaveTrigger([config, targets], isDirty, async () => {
    if (!(original && config)) {
      return;
    }
    const changed = differenceWith(targets, original.targets, isEqual).map(
      (t) => pick(t, ["id", "config"]),
    );
    await save(config, changed);
    await refetch();
    await queryClient.invalidateQueries({ queryKey: targetsKey(serverId) });
  });

  return {
    config,
    // 对外收窄成非 null 的 setter。
    setConfig: setConfig as Dispatch<SetStateAction<TConfig>>,
    setTargets,
    status,
    targets,
  };
};
