import {
  TargetConfigSchema,
  targetSchemaRequest,
  type TargetConfig,
  type targetResponse,
  type targetSchemaRequestType
} from "../schemas/server/target";

// 获取默认的绑定配置
export const getDefaultTargetConfig = (): TargetConfig => {
  return TargetConfigSchema.parse({});
};

export const getDefaultTarget = (): targetSchemaRequestType => {
  return targetSchemaRequest.parse({});
};

export function pickEditableTarget(raw: targetResponse, targets: targetResponse[]): targetResponse {
  const target = targets.find((t) => t.id === raw.id);
  if (!target) {
    throw new Error(); // WTF，为什么，用户是在前端炒菜了吗？
  }
  return target;
}
