import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { UseQueryResult } from "@tanstack/react-query";
import type { z } from "zod";

import type { ServersAPI } from "#shared/model/server/api";
import type { ServerWithStatus } from "#shared/model/server/schema/servers";
import { ServerData } from "@/lib/api";

export const serversKey = ["servers"] as const;
export const serverKey = (id: number) => ["server", id] as const;

export const useServers = (): UseQueryResult<ServerWithStatus[]> =>
  useQuery({
    queryFn: async () => await ServerData.gets(),
    queryKey: serversKey,
  });

export const useServer = (id: number): UseQueryResult<ServerWithStatus> =>
  useQuery({
    queryFn: async () => await ServerData.get(id),
    queryKey: serverKey(id),
  });

export const useCreateServer = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: z.infer<typeof ServersAPI.POST.request>) => {
      await ServerData.post(data);
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: serversKey });
    },
  });
};

export const useDeleteServer = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      await ServerData.delete(id);
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: serversKey });
    },
  });
};
