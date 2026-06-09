import { useQuery } from "@tanstack/react-query";
import type { UseQueryResult } from "@tanstack/react-query";
import type { z } from "zod";

import type { TargetAPI } from "#shared/model/server/api";
import { TargetData } from "@/lib/api";

export const targetsKey = (serverId: number) => ["targets", serverId] as const;

export const useTargets = (
  serverId: number,
): UseQueryResult<z.infer<typeof TargetAPI.GETS.response>> =>
  useQuery({
    queryFn: async () => TargetData.gets(serverId),
    queryKey: targetsKey(serverId),
  });
