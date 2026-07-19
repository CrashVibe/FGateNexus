import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { UseQueryResult } from "@tanstack/react-query";

import type {
  TemplateInstance,
  TemplateInstanceCreate,
  TemplateInstanceUpdate,
} from "#shared/model/template/schema/instance";
import type { TemplateManifest } from "#shared/model/template/schema/manifest";
import { TemplateData, TemplateInstanceData } from "@/lib/api";

export const templatesKey = ["templates"] as const;
export const templateInstancesKey = (serverId: number) =>
  ["template-instances", serverId] as const;

export const useTemplates = (): UseQueryResult<TemplateManifest[]> =>
  useQuery({
    queryFn: async () => await TemplateData.gets(),
    queryKey: templatesKey,
  });

export const useUploadTemplate = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (file: File) => await TemplateData.upload(file),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: templatesKey });
    },
  });
};

export const useDeleteTemplate = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await TemplateData.delete(id);
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: templatesKey });
    },
  });
};

export const useTemplateInstances = (
  serverId: number,
): UseQueryResult<TemplateInstance[]> =>
  useQuery({
    queryFn: async () => await TemplateInstanceData.gets(serverId),
    queryKey: templateInstancesKey(serverId),
  });

export const useCreateInstance = (serverId: number) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: TemplateInstanceCreate) =>
      await TemplateInstanceData.create(serverId, body),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: templateInstancesKey(serverId) });
    },
  });
};

export const useUpdateInstance = (serverId: number) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (args: {
      instanceId: string;
      body: TemplateInstanceUpdate;
    }) =>
      await TemplateInstanceData.update(serverId, args.instanceId, args.body),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: templateInstancesKey(serverId) });
    },
  });
};

export const useDeleteInstance = (serverId: number) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (instanceId: string) => {
      await TemplateInstanceData.delete(serverId, instanceId);
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: templateInstancesKey(serverId) });
    },
  });
};
