import { useQuery } from "@tanstack/react-query";
import type { UseQueryResult } from "@tanstack/react-query";
import type { z } from "zod";

import type { PlayerAPI } from "#shared/model/player/api";
import { PlayerData } from "@/lib/api";

export type PlayerEntry = z.infer<typeof PlayerAPI.GETS.response>[number];

export const usePlayers = (): UseQueryResult<PlayerEntry[]> =>
  useQuery({
    queryFn: async () => await PlayerData.gets(),
    queryKey: ["players"],
  });
