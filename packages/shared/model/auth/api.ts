import { z } from "zod";

import type { ApiSchemaRegistry } from "#shared/model";

export const LoginAPI = {
  DELETE: {
    description: "删除密码",
    request: z.object({
      currentPassword: z.string().nonempty("当前密码不能为空"),
    }),
    response: z.void(),
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
    response: z.void(),
  },
} satisfies ApiSchemaRegistry;

export const PasswordAPI = {
  POST: {
    description: "设置密码",
    request: z.object({
      currentPassword: z.string().optional(),
      newPassword: z.string().min(8, "新密码至少 8 位"),
    }),
    response: z.void(),
  },
} satisfies ApiSchemaRegistry;

/**
 * 登陆状态接口
 */
export type LoginBody = z.infer<typeof LoginAPI.POST.request>;
