import { z } from "zod";

export const createJsonRpcRequestSchema = <S extends z.ZodType>(
  paramsSchema: S,
) =>
  z.object({
    id: z.string().nullable(),
    jsonrpc: z.literal("2.0"),
    method: z.string(),
    params: paramsSchema,
  });

export type JsonRpcRequest = z.infer<
  ReturnType<typeof createJsonRpcRequestSchema<z.ZodUnknown>>
>;

export const jsonRpcResponseSchema = z
  .object({
    error: z
      .object({
        code: z.number(),
        data: z.unknown().optional(),
        message: z.string(),
      })
      .optional(),
    id: z.union([z.string(), z.null()]),
    jsonrpc: z.literal("2.0"),
    result: z.unknown().optional(),
  })
  .refine((o) => "result" in o || "error" in o, {
    message: "Either result or error must be present",
  });

export interface JsonRpcResponse<R = unknown, E = unknown> {
  jsonrpc: string;
  result?: R;
  error?: {
    code: number;
    message: string;
    data?: E;
  };
  id: string | null;
}

export interface PendingRequest<T = unknown> {
  resolve: (value: T) => void;
  reject: (reason?: unknown) => void;
  timeout: NodeJS.Timeout;
}

// MC 事件类型定义
export interface MCEventPayloadMap {
  "player.chat": {
    playerName: string;
    playerUUID: string;
    message: string;
    timestamp: number;
  };
  "player.death": {
    playerName: string;
    playerUUID: string;
    deathMessage: string | null;
    timestamp: number;
  };
  "player.join": {
    playerName: string;
    playerUUID: string;
    timestamp: number;
  };
  "player.leave": {
    playerName: string;
    playerUUID: string;
    timestamp: number;
  };
  "execute.command": {
    success: boolean;
    message: string;
  };
}

export type MCEventType = keyof MCEventPayloadMap;

export interface MCEvent<T extends MCEventType = MCEventType> {
  type: T;
  timestamp: number;
  serverId: number;
  payload: MCEventPayloadMap[T];
}
