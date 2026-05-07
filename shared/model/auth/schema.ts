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
