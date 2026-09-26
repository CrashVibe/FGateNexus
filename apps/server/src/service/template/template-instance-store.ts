import fs from "node:fs";
import path from "node:path";

import { and, count, eq } from "drizzle-orm";

import { db } from "#server/db/client";
import { serverTable, templateInstanceTable } from "#server/db/schema";
import { connectionManager } from "#server/service/mcwsbridge/connection-manager";
import { isDataSourceSupported } from "#server/service/template/data-resolver";
import { TemplateInstanceError } from "#server/service/template/instance-errors";
import {
  getTemplateDir,
  getTemplateManifest,
  TEMPLATE_DIR,
} from "#server/service/template/template-store";
import { logger } from "#server/utils/logger";
import { TemplateInstanceSchema } from "#shared/model/template/schema/instance";
import type {
  TemplateBinding,
  TemplateInstance,
  TemplateInstanceConfig,
} from "#shared/model/template/schema/instance";

const LEGACY_FILE = path.join(TEMPLATE_DIR, "instances.json");

const log = logger.child({}, { msgPrefix: "[TemplateInstance] " });

export interface CreateInstanceInput {
  serverId: number;
  templateId: string;
  name: string;
  config?: TemplateInstanceConfig;
  binding?: TemplateBinding | null;
  enabled?: boolean;
}

export interface UpdateInstancePatch {
  name?: string;
  enabled?: boolean;
  config?: TemplateInstanceConfig;
  binding?: TemplateBinding | null;
}

const byId = (id: string) => eq(templateInstanceTable.id, id);

/** excludeId 排除自身（更新场景） */
const assertBindingUnique = (
  siblings: TemplateInstance[],
  binding: TemplateBinding | null,
  excludeId: string | null,
): void => {
  if (!binding) {
    return;
  }
  for (const i of siblings) {
    if (i.id === excludeId) {
      continue;
    }
    const conflictCommand = i.binding?.commands.find((c) =>
      binding.commands.includes(c),
    );
    if (conflictCommand) {
      throw new TemplateInstanceError(
        `指令「${conflictCommand}」已被其他模板实例占用`,
        409,
      );
    }
  }
};

/** 未连接放行+警告；已连接但缺能力则拒绝 */
const checkEnableCompatibility = async (
  instance: TemplateInstance,
): Promise<{ warning: string | null }> => {
  let manifest: Awaited<ReturnType<typeof getTemplateManifest>>;
  try {
    manifest = await getTemplateManifest(instance.templateId);
  } catch {
    throw new TemplateInstanceError(`模板不存在：${instance.templateId}`, 400);
  }

  const requiredSources = manifest.dataSources.filter((d) => d.required);
  if (requiredSources.length === 0) {
    return { warning: null };
  }

  const session = connectionManager.getConnectionByServerId(instance.serverId);
  if (!session) {
    return {
      warning: "服务器未连接，无法验证模板兼容性，已先行启用",
    };
  }

  const missing = requiredSources
    .filter((ds) => !isDataSourceSupported(ds, session))
    .map((ds) => ds.id);
  if (missing.length > 0) {
    throw new TemplateInstanceError(
      `当前服务器不支持以下必需数据源所需能力：${missing.join(", ")}`,
      400,
    );
  }
  return { warning: null };
};

/** 旧版 instances.json 一次性导入，之后改名留底 */
const init = (): void => {
  if (!fs.existsSync(LEGACY_FILE)) {
    return;
  }
  let imported = 0;
  try {
    const json = JSON.parse(fs.readFileSync(LEGACY_FILE, "utf-8")) as {
      instances?: unknown[];
    };
    const serverIds = new Set(
      db
        .select({ id: serverTable.id })
        .from(serverTable)
        .all()
        .map((r) => r.id),
    );
    for (const raw of json.instances ?? []) {
      const parsed = TemplateInstanceSchema.safeParse({
        ...(raw as object),
        serverId: Number((raw as { serverId?: unknown }).serverId),
      });
      if (
        !parsed.success ||
        !serverIds.has(parsed.data.serverId) ||
        !fs.existsSync(getTemplateDir(parsed.data.templateId))
      ) {
        log.warn({ raw }, "旧模板实例无效或已失联，跳过");
        continue;
      }
      db.insert(templateInstanceTable)
        .values(parsed.data)
        .onConflictDoNothing()
        .run();
      imported += 1;
    }
  } catch (error) {
    // 原文件不动，下次启动再试
    log.error(error, "导入 instances.json 失败");
    return;
  }
  fs.renameSync(LEGACY_FILE, `${LEGACY_FILE}.migrated`);
  log.info(`已从 instances.json 导入 ${imported} 个模板实例`);
};

const listInstances = (serverId: number): TemplateInstance[] =>
  db
    .select()
    .from(templateInstanceTable)
    .where(eq(templateInstanceTable.serverId, serverId))
    .all();

const countByTemplate = (templateId: string): number =>
  db
    .select({ n: count() })
    .from(templateInstanceTable)
    .where(eq(templateInstanceTable.templateId, templateId))
    .get()?.n ?? 0;

const getInstance = (
  serverId: number,
  id: string,
): TemplateInstance | undefined =>
  db
    .select()
    .from(templateInstanceTable)
    .where(and(byId(id), eq(templateInstanceTable.serverId, serverId)))
    .get();

const findBindingByCommand = (
  serverId: number,
  command: string,
): TemplateInstance | undefined =>
  listInstances(serverId).find(
    (i) => i.enabled && (i.binding?.commands.includes(command) ?? false),
  );

const createInstance = async (
  input: CreateInstanceInput,
): Promise<TemplateInstance> => {
  const siblings = listInstances(input.serverId);
  assertBindingUnique(siblings, input.binding ?? null, null);
  if (siblings.some((i) => i.templateId === input.templateId)) {
    throw new TemplateInstanceError(
      "该模板已添加到此服务器，无法重复添加",
      409,
    );
  }

  const now = new Date();
  const instance: TemplateInstance = {
    binding: input.binding ?? null,
    config: input.config ?? {},
    createdAt: now,
    enabled: input.enabled ?? false,
    id: crypto.randomUUID(),
    name: input.name,
    serverId: input.serverId,
    templateId: input.templateId,
    updatedAt: now,
  };

  if (instance.enabled) {
    await checkEnableCompatibility(instance);
  }

  db.insert(templateInstanceTable).values(instance).run();
  log.info({ id: instance.id, serverId: instance.serverId }, "创建模板实例");
  return instance;
};

/** 返回值附带可选的兼容性警告 */
const updateInstance = async (
  serverId: number,
  id: string,
  patch: UpdateInstancePatch,
): Promise<{ instance: TemplateInstance; warning: string | null }> => {
  const existing = getInstance(serverId, id);
  if (!existing) {
    throw new TemplateInstanceError("模板实例不存在", 404);
  }

  const nextBinding =
    patch.binding === undefined ? existing.binding : patch.binding;
  assertBindingUnique(listInstances(serverId), nextBinding, id);

  const updated: TemplateInstance = {
    ...existing,
    binding: nextBinding,
    config: patch.config ?? existing.config,
    enabled: patch.enabled ?? existing.enabled,
    name: patch.name ?? existing.name,
    updatedAt: new Date(),
  };

  const enabling = patch.enabled === true && !existing.enabled;
  let warning: string | null = null;
  if (updated.enabled && (enabling || patch.config !== undefined)) {
    ({ warning } = await checkEnableCompatibility(updated));
  }

  db.update(templateInstanceTable).set(updated).where(byId(id)).run();
  log.info({ id, serverId }, "更新模板实例");
  return { instance: updated, warning };
};

const deleteInstance = (serverId: number, id: string): void => {
  const deleted = db
    .delete(templateInstanceTable)
    .where(and(byId(id), eq(templateInstanceTable.serverId, serverId)))
    .returning({ id: templateInstanceTable.id })
    .all();
  if (deleted.length === 0) {
    throw new TemplateInstanceError("模板实例不存在", 404);
  }
  log.info({ id }, "删除模板实例");
};

export const templateInstanceStore = {
  countByTemplate,
  createInstance,
  deleteInstance,
  findBindingByCommand,
  getInstance,
  init,
  listInstances,
  updateInstance,
};
