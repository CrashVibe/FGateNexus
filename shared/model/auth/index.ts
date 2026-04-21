import { z } from "zod";

import type { ApiSchemaRegistry } from "#shared/model";

export const LoginAPI = {
  DELETE: {
    description: "删除密码",
    request: z.object({
      currentPassword: z.string().nonempty("当前密码不能为空"),
    }),
    response: z.object({}),
  },
  POST: {
    description: "用户登录",
    request: z.object({
      password: z.string("密码不能为空"),
      twoFactorToken: z
        .array(z.string())
        .length(6, "2FA 验证码必须为 6 位")
        .optional(),
    }),
    response: z.object({}),
  },
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
