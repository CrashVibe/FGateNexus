import type { Context } from "hono";
import { deleteCookie, getSignedCookie, setSignedCookie } from "hono/cookie";

import { configManager } from "#server/utils/config";
import { ApiError } from "#shared/model/error";

/**
 * 会话只存 `{ id, username, has2FA }`，用 `hono/cookie` 的签名 Cookie
 * （HMAC，密钥取 config.session.password）。
 */
const COOKIE_NAME = "fgate_session";
const MAX_AGE_SECONDS = 60 * 60 * 24 * 7; // 7 天

export interface SessionUser {
  id: number;
  username: string;
  has2FA: boolean;
}

const secret = (): string => configManager.config.session.password;

export const setUserSession = async (
  c: Context,
  user: SessionUser,
): Promise<void> => {
  await setSignedCookie(c, COOKIE_NAME, JSON.stringify(user), secret(), {
    httpOnly: true,
    maxAge: MAX_AGE_SECONDS,
    path: "/",
    sameSite: "Lax",
  });
};

export const getUserSession = async (
  c: Context,
): Promise<SessionUser | undefined> => {
  const raw = await getSignedCookie(c, secret(), COOKIE_NAME);
  // false = 签名被篡改；undefined = 不存在
  if (raw === false || raw === undefined) {
    return undefined;
  }
  try {
    return JSON.parse(raw) as SessionUser;
  } catch {
    return undefined;
  }
};

/** 要求已登录，否则抛 401（由 onError 统一转换）。 */
export const requireUserSession = async (c: Context): Promise<SessionUser> => {
  const user = await getUserSession(c);
  if (!user) {
    throw ApiError.unauthorized("未认证");
  }
  return user;
};

export const clearUserSession = (c: Context): void => {
  deleteCookie(c, COOKIE_NAME, { path: "/" });
};
