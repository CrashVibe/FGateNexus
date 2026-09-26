import { z } from "zod";

/** Bot / MC 服务器连接状态变化事件，经 SSE 推送 */
export const StatusEventSchema = z.object({
  id: z.number(),
  isOnline: z.boolean(),
  kind: z.enum(["bot", "server"]),
});

export type StatusEvent = z.infer<typeof StatusEventSchema>;

export const LastEventSchema = z.object({
  at: z.number(),
  ok: z.boolean(),
  text: z.string(),
});

export type LastEvent = z.infer<typeof LastEventSchema>;
