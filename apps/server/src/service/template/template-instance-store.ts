import * as fs from "node:fs";
import * as path from "node:path";

import { connectionManager } from "#server/service/mcwsbridge/connection-manager";
import { isDataSourceSupported } from "#server/service/template/data-resolver";
import { TemplateInstanceError } from "#server/service/template/instance-errors";
import { getTemplateManifest } from "#server/service/template/template-store";
import { logger } from "#server/utils/logger";
import { TemplateInstanceSchema } from "#shared/model/template/schema/instance";
import type {
  TemplateBinding,
  TemplateInstance,
  TemplateInstanceConfig,
} from "#shared/model/template/schema/instance";

const INSTANCES_FILE = path.resolve(
  process.cwd(),
  "data/templates/instances.json",
);

const log = logger.child({}, { msgPrefix: "[TemplateInstance] " });

export { TemplateInstanceError };

export interface CreateInstanceInput {
  serverId: string;
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

class TemplateInstanceStore {
  private instances: TemplateInstance[] | null = null;
  private writeQueue: Promise<void> = Promise.resolve();

  /** 幂等 */
  public init(): void {
    this.ensureLoaded();
  }

  public listInstances(serverId?: string): TemplateInstance[] {
    this.ensureLoaded();
    const all = this.instances ?? [];
    return serverId ? all.filter((i) => i.serverId === serverId) : [...all];
  }

  public getInstance(id: string): TemplateInstance | undefined {
    this.ensureLoaded();
    return this.instances?.find((i) => i.id === id);
  }

  public findBindingByCommand(
    serverId: string,
    command: string,
  ): TemplateInstance | undefined {
    this.ensureLoaded();
    return this.instances?.find(
      (i) =>
        i.serverId === serverId &&
        i.enabled &&
        (i.binding?.commands.includes(command) ?? false),
    );
  }

  public async createInstance(
    input: CreateInstanceInput,
  ): Promise<TemplateInstance> {
    this.ensureLoaded();
    this.assertBindingUnique(input.serverId, input.binding ?? null, null);
    this.assertTemplateUnique(input.serverId, input.templateId);

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
      await TemplateInstanceStore.checkEnableCompatibility(instance);
    }

    this.instances?.push(instance);
    await this.persist();
    log.info({ id: instance.id, serverId: instance.serverId }, "创建模板实例");
    return instance;
  }

  /** 返回值附带可选的兼容性警告 */
  public async updateInstance(
    id: string,
    patch: UpdateInstancePatch,
  ): Promise<{ instance: TemplateInstance; warning: string | null }> {
    this.ensureLoaded();
    const existing = this.getInstance(id);
    if (!existing) {
      throw new TemplateInstanceError("模板实例不存在", 404);
    }

    const nextBinding =
      patch.binding === undefined ? existing.binding : patch.binding;
    this.assertBindingUnique(existing.serverId, nextBinding, id);

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
      ({ warning } =
        await TemplateInstanceStore.checkEnableCompatibility(updated));
    }

    const index = this.instances?.findIndex((i) => i.id === id) ?? -1;
    if (index >= 0 && this.instances) {
      this.instances[index] = updated;
    }
    await this.persist();
    log.info({ id, serverId: updated.serverId }, "更新模板实例");
    return { instance: updated, warning };
  }

  public async deleteInstance(id: string): Promise<void> {
    this.ensureLoaded();
    const before = this.instances?.length ?? 0;
    this.instances = (this.instances ?? []).filter((i) => i.id !== id);
    if ((this.instances?.length ?? 0) === before) {
      throw new TemplateInstanceError("模板实例不存在", 404);
    }
    await this.persist();
    log.info({ id }, "删除模板实例");
  }

  /** excludeId 排除自身（更新场景） */
  private assertBindingUnique(
    serverId: string,
    binding: TemplateBinding | null,
    excludeId: string | null,
  ): void {
    if (!binding) {
      return;
    }
    for (const i of this.instances ?? []) {
      if (i.id === excludeId || i.serverId !== serverId) {
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
  }

  private assertTemplateUnique(serverId: string, templateId: string): void {
    const exists = (this.instances ?? []).some(
      (i) => i.serverId === serverId && i.templateId === templateId,
    );
    if (exists) {
      throw new TemplateInstanceError(
        "该模板已添加到此服务器，无法重复添加",
        409,
      );
    }
  }

  /** 未连接放行+警告；已连接但缺能力则拒绝 */
  private static async checkEnableCompatibility(
    instance: TemplateInstance,
  ): Promise<{ warning: string | null }> {
    let manifest: Awaited<ReturnType<typeof getTemplateManifest>>;
    try {
      manifest = await getTemplateManifest(instance.templateId);
    } catch {
      throw new TemplateInstanceError(
        `模板不存在：${instance.templateId}`,
        400,
      );
    }

    const requiredSources = manifest.dataSources.filter((d) => d.required);
    if (requiredSources.length === 0) {
      return { warning: null };
    }

    const session = connectionManager.getConnectionByServerId(
      Number(instance.serverId),
    );
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
  }

  private ensureLoaded(): void {
    if (this.instances !== null) {
      return;
    }
    if (!fs.existsSync(INSTANCES_FILE)) {
      this.instances = [];
      TemplateInstanceStore.writeFileSync([]);
      return;
    }
    try {
      const raw = fs.readFileSync(INSTANCES_FILE, "utf-8");
      const json = JSON.parse(raw) as { instances?: unknown };
      this.instances = TemplateInstanceSchema.array().parse(
        json.instances ?? [],
      );
    } catch (error) {
      log.error(error, "模板实例文件读取/校验失败，已重置为空");
      this.instances = [];
      TemplateInstanceStore.writeFileSync([]);
    }
  }

  private static writeFileSync(instances: TemplateInstance[]): void {
    fs.mkdirSync(path.dirname(INSTANCES_FILE), { recursive: true });
    fs.writeFileSync(
      INSTANCES_FILE,
      JSON.stringify({ instances }, null, 2),
      "utf-8",
    );
  }

  /** 串行化，避免并发 PATCH 互相覆盖 */
  private async persist(): Promise<void> {
    const snapshot = [...(this.instances ?? [])];
    const previous = this.writeQueue;
    this.writeQueue = (async () => {
      await previous;
      await fs.promises.mkdir(path.dirname(INSTANCES_FILE), {
        recursive: true,
      });
      await fs.promises.writeFile(
        INSTANCES_FILE,
        JSON.stringify({ instances: snapshot }, null, 2),
        "utf-8",
      );
    })();
    await this.writeQueue;
  }
}

export const templateInstanceStore = new TemplateInstanceStore();
