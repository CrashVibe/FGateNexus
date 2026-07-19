import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { UseQueryResult } from "@tanstack/react-query";
import type { z } from "zod";

import type {
  BotAPI,
  BotsWithStatus,
  BotWithStatus,
} from "#shared/model/bot/api";
import { BotData } from "@/lib/api";

export const botsKey = ["bots"] as const;

export const useBots = (): UseQueryResult<BotsWithStatus> =>
  useQuery({ queryFn: async () => await BotData.gets(), queryKey: botsKey });

export const useBot = (botId: number | null): UseQueryResult<BotWithStatus> =>
  useQuery({
    enabled: botId !== null,
    queryFn: async () => await BotData.get(botId!),
    queryKey: ["bot", botId],
  });

export const useCreateBot = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: z.infer<typeof BotAPI.POST.request>) => {
      await BotData.post(data);
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: botsKey });
    },
  });
};

export const useUpdateBot = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (vars: {
      id: number;
      data: z.infer<typeof BotAPI.PUT.request>;
    }) => {
      await BotData.put(vars.id, vars.data);
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: botsKey });
    },
  });
};

export const useDeleteBot = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      await BotData.delete(id);
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: botsKey });
    },
  });
};

export const useToggleBot = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (vars: { id: number; enabled: boolean }) => {
      await BotData.postToggle(vars.id, { enabled: vars.enabled });
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: botsKey });
    },
  });
};
