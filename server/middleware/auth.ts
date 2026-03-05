import { defineEventHandler } from "h3";
import { db } from "~~/server/db/client";

export default defineEventHandler(async (event) => {
  const { url, method } = event.node.req;

  if (url === undefined || !url.startsWith("/api/")) {
    return;
  }

  // 公开端点
  const publicEndpoints = [
    { method: "POST", path: "/api/auth/login" },
    { method: "POST", path: "/api/auth/logout" },
    { method: "GET", path: "/api/auth/status" },
    { method: "POST", path: "/api/auth/password" },
  ];

  const isPublicEndpoint = publicEndpoints.some(
    (endpoint) => url.startsWith(endpoint.path) && method === endpoint.method,
  );

  // nuxt auth utils session 端点 开放
  const isAuthSession = url.startsWith("/api/_auth/");

  if (isPublicEndpoint || isAuthSession) {
    return;
  }

  const user = await db.query.users.findFirst();

  if (!user || user.passwordHash === null || user.passwordHash === "") {
    return;
  }

  await requireUserSession(event);
});
