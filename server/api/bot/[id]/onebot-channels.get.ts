import { OneBot } from "@mrlingxd/koishi-plugin-adapter-onebot";
import { eq } from "drizzle-orm";
import { getRouterParam } from "h3";
import { StatusCodes } from "http-status-codes";
import { db } from "~~/server/db/client";
import { botTable } from "~~/server/db/schema";
import { chatBridge } from "~~/server/service/chatbridge";
import { createApiResponse } from "~~/shared/model";

import { PlatformType } from "#shared/model/bot/types";
import { ApiError, createErrorResponse } from "#shared/model/error";

interface ChannelItem {
  id: string;
  name: string;
  type: "group" | "private";
  avatar?: string;
}

export default cachedEventHandler(
  async (event) => {
    try {
      const botId = Number(getRouterParam(event, "id"));
      if (Number.isNaN(botId)) {
        const apiError = ApiError.validation("无效的 Bot ID");
        return createErrorResponse(event, apiError);
      }

      const botRecord = await db.query.botTable.findFirst({
        where: eq(botTable.id, botId),
      });

      if (!botRecord) {
        const apiError = ApiError.notFound("未能找到 Bot");
        return createErrorResponse(event, apiError);
      }

      if (botRecord.platform !== PlatformType.Onebot) {
        const apiError = ApiError.validation("Bot 类型不是 OneBot");
        return createErrorResponse(event, apiError);
      }

      const botConnection = chatBridge.get(botId);
      if (!botConnection || !botConnection.isOnline()) {
        const apiError = ApiError.notFound("Bot 未上线或机器人未找到");
        return createErrorResponse(event, apiError);
      }

      const { bot } = botConnection;
      if (!(bot instanceof OneBot)) {
        const apiError = ApiError.validation("Bot 类型不是 OneBot");
        return createErrorResponse(event, apiError);
      }

      const channels: ChannelItem[] = [];

      const groupList = await bot.internal.getGroupList();
      for (const group of groupList) {
        channels.push({
          avatar: `https://p.qlogo.cn/gh/${group.group_id}/${group.group_id}/640`,
          id: String(group.group_id),
          name: group.group_name || `群 ${group.group_id}`,
          type: "group",
        });
      }

      const friendList = await bot.internal.getFriendList();
      for (const friend of friendList) {
        channels.push({
          avatar: `http://q.qlogo.cn/headimg_dl?dst_uin=${friend.user_id}&spec=640&img_type=jpg`,
          id: String(friend.user_id),
          name: friend.nickname || friend.remark || `用户 ${friend.user_id}`,
          type: "private",
        });
      }

      return createApiResponse(
        event,
        "获取 OneBot 频道列表成功",
        StatusCodes.OK,
        channels,
      );
    } catch (error) {
      console.error("[OneBot Channels API Error]", error);
      const apiError = ApiError.internal("获取频道列表失败");
      return createErrorResponse(event, apiError);
    }
  },
  {
    getKey: (event) => event.path,
    maxAge: 10,
    swr: false,
  },
);
