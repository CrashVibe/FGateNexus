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
    queryFn: async () => TemplateData.gets(),
    queryKey: templatesKey,
  });

export const useUploadTemplate = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (file: File) => TemplateData.upload(file),
    onSuccess: async () => qc.invalidateQueries({ queryKey: templatesKey }),
  });
};

export const useDeleteTemplate = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => TemplateData.delete(id),
    onSuccess: async () => qc.invalidateQueries({ queryKey: templatesKey }),
  });
};

export const useTemplateInstances = (
  serverId: number,
): UseQueryResult<TemplateInstance[]> =>
  useQuery({
    queryFn: async () => TemplateInstanceData.gets(serverId),
    queryKey: templateInstancesKey(serverId),
  });

export const useCreateInstance = (serverId: number) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: TemplateInstanceCreate) =>
      TemplateInstanceData.create(serverId, body),
    onSuccess: async () =>
      qc.invalidateQueries({ queryKey: templateInstancesKey(serverId) }),
  });
};

export const useUpdateInstance = (serverId: number) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (args: {
      instanceId: string;
      body: TemplateInstanceUpdate;
    }) => TemplateInstanceData.update(serverId, args.instanceId, args.body),
    onSuccess: async () =>
      qc.invalidateQueries({ queryKey: templateInstancesKey(serverId) }),
  });
};

export const useDeleteInstance = (serverId: number) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (instanceId: string) =>
      TemplateInstanceData.delete(serverId, instanceId),
    onSuccess: async () =>
      qc.invalidateQueries({ queryKey: templateInstancesKey(serverId) }),
  });
};
