/**
 * nuxt-auth-utils 的类型扩展
 *
 * 可能会忘？总之就是扩展一下 User 接口
 *
 * @see
 * https://github.com/atinux/nuxt-auth-utils?tab=readme-ov-file#session-management
 */

declare module "#auth-utils" {
  interface User {
    id: number;
    username: string;
    has2FA: boolean;
  }
}

export {};
