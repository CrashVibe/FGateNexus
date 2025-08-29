import {
    TargetConfigSchema,
    targetSchemaRequest,
    type TargetConfig,
    type targetSchemaRequestType
} from "../schemas/server/target";

// 获取默认的绑定配置
export const getDefaultTargetConfig = (): TargetConfig => {
    return TargetConfigSchema.parse({});
};

export const getDefaultTarget = (): targetSchemaRequestType => {
    return targetSchemaRequest.parse({});
};
