import { z } from "zod";

import type { ApiSchemaRegistry } from "#shared/model";
import {
  TemplateInstanceCreateSchema,
  TemplateInstanceSchema,
  TemplateInstanceUpdateResponseSchema,
  TemplateInstanceUpdateSchema,
} from "#shared/model/template/schema/instance";
import { TemplateManifestSchema } from "#shared/model/template/schema/manifest";

/** 上传走 multipart/form-data（字段名 file），故不用 zod 描述请求体 */
export const TemplateAPI = {
  DELETE: {
    description: "删除已安装模板",
    request: z.void(),
    response: z.void(),
  },
  GET: {
    description: "获取单个已安装模板清单",
    request: z.void(),
    response: TemplateManifestSchema,
  },
  GETS: {
    description: "获取已安装模板列表",
    request: z.void(),
    response: z.array(TemplateManifestSchema),
  },
  UPLOAD: {
    description: "上传模板包（multipart/form-data，字段名 file）",
    request: z.void(),
    response: TemplateManifestSchema,
  },
} satisfies ApiSchemaRegistry;

export const TemplateInstanceAPI = {
  DELETE: {
    description: "删除模板实例",
    request: z.void(),
    response: z.void(),
  },
  GETS: {
    description: "获取服务器的模板实例列表",
    request: z.void(),
    response: z.array(TemplateInstanceSchema),
  },
  PATCH: {
    description: "更新模板实例",
    request: TemplateInstanceUpdateSchema,
    response: TemplateInstanceUpdateResponseSchema,
  },
  POST: {
    description: "创建模板实例",
    request: TemplateInstanceCreateSchema,
    response: TemplateInstanceSchema,
  },
} satisfies ApiSchemaRegistry;
