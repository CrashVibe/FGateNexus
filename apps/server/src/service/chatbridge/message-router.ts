import type { Session } from "koishi";

import { getBoundPlayer } from "#server/db/queries/player";
import { getServersByBotIdWithTargets } from "#server/db/queries/server";
import type { ServerWithTargets } from "#server/db/queries/server";
import { connectionManager } from "#server/service/mcwsbridge/connection-manager";
import { buildSystemTemplateEvent } from "#server/service/mcwsbridge/types";
import { resolveDataSources } from "#server/service/template/data-resolver";
import { templateInstanceStore } from "#server/service/template/template-instance-store";
import { renderTemplateInstance } from "#server/service/template/template-renderer";
import { getTemplateManifest } from "#server/service/template/template-store";
import { logger } from "#server/utils/logger";
import {
  formatPlatformToMCMessage,
  shouldForwardMessage,
} from "#shared/utils/chat-sync";

import { chatBridge } from ".";
import type { PlatformSender } from "./sender/types";
import { elements_to_string } from "./utils";

type ServerSession = ReturnType<
  typeof connectionManager.getConnectionByServerId
>;

type ServerTarget = ServerWithTargets["targets"][number];

const findSessionTarget = (
  session: Session,
  server: ServerWithTargets,
): ServerTarget | undefined =>
  server.targets.find((t) =>
    t.type === "group"
      ? t.channelId === session.channelId
      : t.channelId === session.userId,
  );

/** 私聊不限权限 */
const hasRolePermission = (
  session: Session,
  target: ServerTarget,
  permissions: string[],
): boolean => {
  if (target.type === "private") {
    return true;
  }
  const roles = session.event.member?.roles ?? [];
  return roles.some((r) => r.id && permissions.includes(r.id));
};

/** 与远程指令开关/前缀无关，binding.commands 全词匹配 */
const handleTemplateCommand = async (
  connection: PlatformSender,
  session: Session,
  server: ServerWithTargets,
  serverSession: ServerSession,
  target: ServerTarget | undefined,
): Promise<boolean> => {
  if (!target) {
    return false;
  }

  const commandWord = session.content!.trim().split(/\s+/u)[0] ?? "";
  if (!commandWord) {
    return false;
  }

  const instance = templateInstanceStore.findBindingByCommand(
    String(server.id),
    commandWord,
  );
  if (!instance) {
    return false;
  }

  if (
    !hasRolePermission(session, target, instance.binding?.permissions ?? [])
  ) {
    return false;
  }

  if (!serverSession) {
    logger.warn(`服务器 ${server.id} 没有活动的 MCWS 连接，无法渲染模板`);
    return false;
  }

  let buffer: Buffer;
  try {
    const manifest = await getTemplateManifest(instance.templateId);
    const contextPlayer = session.userId
      ? await getBoundPlayer(session.platform, session.userId, server.id)
      : null;
    const data = await resolveDataSources(manifest, serverSession, {
      config: instance.config,
      contextPlayer,
    });
    buffer = await renderTemplateInstance(
      instance.config,
      instance.name,
      manifest,
      data,
      server.name,
    );
  } catch (error) {
    logger.error(error, `[模板] 渲染实例 ${instance.id} 失败`);
    const message = error instanceof Error ? error.message : "未知错误";
    await connection.onTemplate(
      buildSystemTemplateEvent(server.id, { error: message, success: false }),
      target,
    );
    return true;
  }

  // 发送失败不再回退提示
  await connection.onTemplate(
    buildSystemTemplateEvent(server.id, { image: buffer, success: true }),
    target,
  );
  return true;
};

const handlePlatformCommand = async (
  session: Session,
  server: ServerWithTargets,
  serverSession: ServerSession,
  commandTarget: ServerTarget | undefined,
): Promise<boolean> => {
  if (!commandTarget) {
    return false;
  }

  const { enabled, prefix, permissions } =
    commandTarget.config.CommandConfigSchema;
  if (!enabled || !session.content!.startsWith(prefix)) {
    return false;
  }

  if (!hasRolePermission(session, commandTarget, permissions)) {
    return false;
  }

  if (!serverSession) {
    logger.warn(`服务器 ${server.id} 没有活动的 MCWS 连接，无法执行指令`);
    return false;
  }

  const { success, message } = await serverSession.executeCommand(
    session.content!.slice(prefix.length),
    server.commandConfig.imageRender,
  );

  await chatBridge.dispatch({
    payload: { message, success },
    serverId: server.id,
    timestamp: Date.now(),
    type: "execute.command",
  });

  return true;
};

const handlePlatformChatSync = (
  session: Session,
  server: ServerWithTargets,
  serverSession: ServerSession,
): void => {
  const { chatSyncConfig } = server;
  if (session.elements === undefined) {
    return;
  }
  const content = elements_to_string(session.elements);
  if (
    !chatSyncConfig.platformToMcEnabled ||
    !shouldForwardMessage(content, chatSyncConfig)
  ) {
    return;
  }

  if (!serverSession) {
    logger.warn(`服务器 ${server.id} 没有活动的 MCWS 连接，无法广播`);
    return;
  }

  if (!session.userId) {
    throw new Error("消息格式化时用户 ID 不存在");
  }

  const formattedMessage = formatPlatformToMCMessage(
    chatSyncConfig.platformToMcTemplate,
    {
      message: content,
      nickname: session.username,
      platform: session.platform,
      timestamp: session.timestamp,
      userId: session.userId,
    },
  );

  serverSession.broadcastMessageToServer(formattedMessage);
  logger.info(`[消息路由] 已将平台消息转发到 MC 服务器 ${server.id}`);
};

/**
 * 处理来自聊天平台的消息，转发到对应的 MC 服务器
 */
export const handlePlatformMessage = async (
  connection: PlatformSender,
  session: Session,
): Promise<void> => {
  if (session.content === undefined) {
    return;
  }

  try {
    const serversWithConfig = await getServersByBotIdWithTargets(
      connection.botId,
    );

    for (const server of serversWithConfig) {
      const serverSession = connectionManager.getConnectionByServerId(
        server.id,
      );
      const target = findSessionTarget(session, server);

      // 1. 图片模板指令
      const isTemplateHandled = await handleTemplateCommand(
        connection,
        session,
        server,
        serverSession,
        target,
      );
      if (isTemplateHandled) {
        return;
      } // 阻断不处理

      // 2. 处理远程指令
      const isCommandHandled = await handlePlatformCommand(
        session,
        server,
        serverSession,
        target,
      );
      if (isCommandHandled) {
        return;
      } // 阻断不处理

      // 3. 处理聊天消息同步
      handlePlatformChatSync(session, server, serverSession);
    }
  } catch (error) {
    logger.error(error, `[消息路由] 处理平台消息时出错：`);
  }
};
