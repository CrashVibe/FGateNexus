import { defineEventHandler } from "h3";
import { getDatabase } from "~~/server/db/client";

export default defineEventHandler(async (event) => {
    const {url, method} = event.node.req;

    if (!url?.startsWith("/api/")) {
        return;
    }

    // 公开端点
    const publicEndpoints = [
        { path: "/api/auth/login", method: "POST" },
        { path: "/api/auth/logout", method: "POST" },
        { path: "/api/auth/status", method: "GET" },
        { path: "/api/auth/password", method: "POST" }
    ];

    const isPublicEndpoint = publicEndpoints.some(
        (endpoint) => url.startsWith(endpoint.path) && method === endpoint.method
    );

    // nuxt auth utils session 端点 开放
    const isAuthSession = url.startsWith("/api/_auth/");

    if (isPublicEndpoint || isAuthSession) {
        return;
    }

    const database = await getDatabase();
    const user = await database.query.users.findFirst();

    if (!user || !user.passwordHash) {
        return;
    }

    await requireUserSession(event);
});
