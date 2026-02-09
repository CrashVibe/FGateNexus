import type { ApiSchemaRegistry } from "..";
import { z } from "zod";

export const LoginAPI = {
  POST: {
    description: "用户登录",
    request: z.object({
      password: z.string().min(1, "密码不能为空"),
      twoFactorToken: z.string().optional()
    }),
    response: z.object({})
  },
  DELETE: {
    description: "删除密码",
    request: z.object({
      currentPassword: z.string().min(1, "当前密码不能为空")
    }),
    response: z.object({})
  }
} satisfies ApiSchemaRegistry;

export type LoginBody = z.infer<typeof LoginAPI.POST.request>;

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
}
