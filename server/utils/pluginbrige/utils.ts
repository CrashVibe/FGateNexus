import type { JsonRpcResponse } from "./types";

export function isValidJsonRpcResponse(obj: unknown): obj is JsonRpcResponse {
    if (typeof obj !== "object" || obj === null) {
        return false;
    }
    const o = obj as Record<string, unknown>;
    if (o["jsonrpc"] !== "2.0") {
        return false;
    }
    if (!("result" in o || "error" in o)) {
        return false;
    }
    if (!("id" in o) || !(typeof o["id"] === "string" || o["id"] === null)) {
        return false;
    }
    return true;
}
