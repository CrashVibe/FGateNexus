import type {
  TargetConfig,
  targetResponse,
  targetSchemaRequestType,
} from "#shared/model/server/target";
import {
  TargetConfigSchema,
  targetSchemaRequest,
} from "#shared/model/server/target";

// 获取默认的绑定配置
export const getDefaultTargetConfig = (): TargetConfig =>
  TargetConfigSchema.parse({});

export const getDefaultTarget = (): targetSchemaRequestType =>
  targetSchemaRequest.parse({});

export const pickEditableTarget = (
  raw: targetResponse,
  targets: targetResponse[],
): targetResponse => {
  const target = targets.find((t) => t.id === raw.id);
  if (!target) {
    // WTF，为什么，用户是在前端炒菜了吗？
    throw new Error("Target not found in list");
  }
  return target;
};
