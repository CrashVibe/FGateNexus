import { v4 as uuidv4 } from "uuid";
import { z } from "zod";

export const ServerTokenSchema = z
  .string()
  .min(4, "Token 长度至少为 4 个字符")
  .max(64, "Token 长度最多为 64 个字符");

export const ServerNameSchema = z
  .string()
  .min(2, "长度至少为 2 个字符")
  .max(24, "长度最多为 24 个字符");

// crypto.randomUUID 只在 HTTPS/localhost 可用，局域网 http 访问面板会炸
export const generateServerToken = (): string => uuidv4();
