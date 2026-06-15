import { Hono } from "hono";
import { bodyLimit } from "hono/body-limit";
import { StatusCodes } from "http-status-codes";

import { fail, guard, ok } from "#server/http/respond";
import { templateInstanceStore } from "#server/service/template/template-instance-store";
import {
  getTemplateManifest,
  installTemplate,
  listTemplates,
  removeTemplate,
  TemplateStoreError,
} from "#server/service/template/template-store";
import { ApiError } from "#shared/model/error";

const MAX_UPLOAD_BYTES = 50 * 1024 * 1024;

/** 删除前占用检查 */
const templateInstanceReferenceCount = (id: string): number =>
  templateInstanceStore
    .listInstances()
    .filter((instance) => instance.templateId === id).length;

export const templatesRouter = new Hono()
  .get(
    "/",
    guard("获取模板列表失败", async (c) => {
      const templates = await listTemplates();
      return ok(c, "获取模板列表成功", StatusCodes.OK, templates);
    }),
  )
  .post(
    "/",
    bodyLimit({
      maxSize: MAX_UPLOAD_BYTES,
      onError: (c) => fail(c, ApiError.badRequest("上传文件过大")),
    }),
    guard("上传模板失败", async (c) => {
      const form = await c.req.formData();
      const file = form.get("file");
      if (!(file instanceof File)) {
        return fail(c, ApiError.badRequest("缺少上传文件（字段名 file）"));
      }
      const buffer = Buffer.from(await file.arrayBuffer());
      try {
        const manifest = await installTemplate(buffer);
        return ok(c, "模板上传成功", StatusCodes.CREATED, manifest);
      } catch (error) {
        if (error instanceof TemplateStoreError) {
          return fail(c, ApiError.badRequest(error.message));
        }
        throw error;
      }
    }),
  )
  .get(
    "/:id",
    guard("获取模板失败", async (c) => {
      const id = c.req.param("id");
      if (!id) {
        return fail(c, ApiError.badRequest("缺少模板 id"));
      }
      try {
        const manifest = await getTemplateManifest(id);
        return ok(c, "获取模板成功", StatusCodes.OK, manifest);
      } catch (error) {
        if (error instanceof TemplateStoreError) {
          return fail(c, ApiError.notFound(error.message));
        }
        throw error;
      }
    }),
  )
  .delete(
    "/:id",
    guard("删除模板失败", async (c) => {
      const id = c.req.param("id");
      if (!id) {
        return fail(c, ApiError.badRequest("缺少模板 id"));
      }
      const referencingCount = templateInstanceReferenceCount(id);
      if (referencingCount > 0) {
        return fail(
          c,
          ApiError.conflict(
            `该模板仍被 ${referencingCount} 个服务器实例引用，无法删除`,
          ),
        );
      }
      try {
        await removeTemplate(id);
        return ok(c, "模板已删除", StatusCodes.OK);
      } catch (error) {
        if (error instanceof TemplateStoreError) {
          return fail(c, ApiError.notFound(error.message));
        }
        throw error;
      }
    }),
  );
