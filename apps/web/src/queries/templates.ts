import { useMutation, useQuery } from "@tanstack/react-query";
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

export const useUploadTemplate = () =>
  useMutation({
    mutationFn: async (file: File) => await TemplateData.upload(file),
  });

export const useDeleteTemplate = () =>
  useMutation({
    mutationFn: async (id: string) => {
      await TemplateData.delete(id);
    },
  });

export const useTemplateInstances = (
  serverId: number,
): UseQueryResult<TemplateInstance[]> =>
  useQuery({
    queryFn: async () => await TemplateInstanceData.gets(serverId),
    queryKey: templateInstancesKey(serverId),
  });

export const useCreateInstance = (serverId: number) =>
  useMutation({
    mutationFn: async (body: TemplateInstanceCreate) =>
      await TemplateInstanceData.create(serverId, body),
  });

export const useUpdateInstance = (serverId: number) =>
  useMutation({
    mutationFn: async (args: {
      instanceId: string;
      body: TemplateInstanceUpdate;
    }) =>
      await TemplateInstanceData.update(serverId, args.instanceId, args.body),
  });

export const useDeleteInstance = (serverId: number) =>
  useMutation({
    mutationFn: async (instanceId: string) => {
      await TemplateInstanceData.delete(serverId, instanceId);
    },
  });
