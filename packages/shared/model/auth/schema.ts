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
   * 当前请求是否已登录（由会话 Cookie 判定）。
   * 供 SPA 路由守卫使用。
   */
  loggedIn: boolean;
}
