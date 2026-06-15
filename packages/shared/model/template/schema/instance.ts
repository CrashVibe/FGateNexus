import { z } from "zod";

import { PlaceholderListEntrySchema } from "./manifest";

export const TemplateBindingSchema = z.object({
  commands: z.array(z.string().min(1)).min(1),
  permissions: z.array(z.string()).default([]),
});

/** 具体字段由 manifest.configSchema 动态约束，这里仅约束基础类型 */
export const TemplateInstanceConfigSchema = z.record(
  z.string(),
  z.union([
    z.string(),
    z.number(),
    z.boolean(),
    z.array(PlaceholderListEntrySchema),
  ]),
);

export type TemplateInstanceConfig = z.infer<
  typeof TemplateInstanceConfigSchema
>;

export const TemplateInstanceSchema = z.object({
  binding: TemplateBindingSchema.nullable().default(null),
  config: TemplateInstanceConfigSchema.default({}),
  createdAt: z.coerce.date(),
  enabled: z.boolean().default(false),
  id: z.uuid(),
  name: z.string().default(""),
  serverId: z.string(),
  templateId: z.string(),
  updatedAt: z.coerce.date(),
});

export type TemplateInstance = z.infer<typeof TemplateInstanceSchema>;
export type TemplateBinding = z.infer<typeof TemplateBindingSchema>;

export const TemplateInstanceCreateSchema = z.object({
  binding: TemplateBindingSchema.nullable().default(null),
  config: TemplateInstanceConfigSchema.default({}),
  enabled: z.boolean().default(false),
  name: z.string().default(""),
  templateId: z.string().min(1),
});

export const TemplateInstanceUpdateSchema = z.object({
  binding: TemplateBindingSchema.nullable().optional(),
  config: TemplateInstanceConfigSchema.optional(),
  enabled: z.boolean().optional(),
  name: z.string().optional(),
});

/** 基于未保存的配置渲染预览图 */
export const TemplateInstanceRenderPreviewSchema = z.object({
  config: TemplateInstanceConfigSchema,
  templateId: z.string().min(1),
});

/** warning 为可选的兼容性提示 */
export const TemplateInstanceUpdateResponseSchema = z.object({
  instance: TemplateInstanceSchema,
  warning: z.string().nullable(),
});

export type TemplateInstanceCreate = z.input<
  typeof TemplateInstanceCreateSchema
>;
export type TemplateInstanceUpdate = z.infer<
  typeof TemplateInstanceUpdateSchema
>;
