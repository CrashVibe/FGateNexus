import { defineEventHandler } from "h3";
import { requireAuth } from "~~/server/utils/middleware";

export default defineEventHandler(async (event) => {
    const url = event.node.req.url;
    const method = event.node.req.method;

    if (!url?.startsWith("/api/")) {
        return;
    }

    // 白名单
    const publicEndpoints = [
        // 认证状态查询
        { path: "/api/auth/status", method: "GET" },

        // 登录相关
        { path: "/api/auth/login", method: "POST" },
        { path: "/api/auth/logout", method: "POST" },
        { path: "/api/auth/2fa/verify", method: "POST" }
    ];

    const isPublicEndpoint = publicEndpoints.some(
        (endpoint) => url.startsWith(endpoint.path) && method === endpoint.method
    );

    if (!isPublicEndpoint) {
        await requireAuth(event);
    }
});
