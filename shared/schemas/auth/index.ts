import { z } from "zod";

/**
 * 登录请求体验证 Schema
 */
export const loginBodySchema = z.object({
  password: z.string().min(1, "密码不能为空"),
  twoFactorToken: z.string().optional()
});

/**
 * 登录请求体类型
 */
export type LoginBody = z.infer<typeof loginBodySchema>;

/**
 * 删除密码请求体验证 Schema
 */
export const deletePasswordBodySchema = z.object({
  currentPassword: z.string().min(1, "当前密码不能为空")
});

/**
 * 删除密码请求体类型
 */
export type DeletePasswordBody = z.infer<typeof deletePasswordBodySchema>;

/**
 * 登陆状态接口
 */
export interface AuthStatus {
  /**
   * 是否已设置密码
   */
  hasPassword: boolean;

  /**
   * 是否启用两步验证
   */
  has2FA: boolean;

  /**
   * 是否已认证（已登录）
   */
  isAuthenticated: boolean;
}
