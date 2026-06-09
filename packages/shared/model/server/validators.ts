import { z } from "zod";

export const ServerTokenSchema = z
  .string()
  .min(4, "Token 长度至少为 4 个字符")
  .max(64, "Token 长度最多为 64 个字符");

export const ServerNameSchema = z
  .string()
  .min(2, "长度至少为 2 个字符")
  .max(24, "长度最多为 24 个字符");
