import { useEventSource } from "@vueuse/core";
import type { z } from "zod";

import type { ApiResponse } from "#shared/model";
import type { PasswordAPI } from "#shared/model/auth/api";
import { BotAPI } from "#shared/model/bot/api";
import { PlatformType } from "#shared/model/bot/types";
import { isFetchError } from "#shared/model/error";
import { PlayerAPI } from "#shared/model/player/api";
import type {
  NotifyAPI,
  BindingAPI,
  ChatSyncAPI,
  CommandAPI,
  GeneralAPI,
} from "#shared/model/server/api";
import { ServersAPI, TargetAPI } from "#shared/model/server/api";
import { SettingsAPI } from "#shared/model/settings";

export const fetchErrorMsg = (error: unknown): string => {
  if (isFetchError(error)) {
    return error.data?.message ?? error.message;
  }
  return String(error);
};

export const AuthData = {
  async deletePassword(currentPassword: string) {
    await $fetch<ApiResponse>("/api/auth/password", {
      body: { currentPassword },
      method: "DELETE",
    });
  },
  async remove2FA() {
    await $fetch<ApiResponse>("/api/auth/2fa", { method: "DELETE" });
  },
  async setPassword(body: z.infer<typeof PasswordAPI.POST.request>) {
    await $fetch<ApiResponse>("/api/auth/password", {
      body,
      method: "POST",
    });
  },
  async setup2FA() {
    const response = await $fetch<
      ApiResponse<{ keyuri: string; secret: string }>
    >("/api/auth/2fa/setup");
    return response.data;
  },
  async verify2FA(secret: string, token: string) {
    await $fetch<ApiResponse>("/api/auth/2fa/verify", {
      body: { secret, token },
      method: "POST",
    });
  },
};

export const ServerData = {
  async delete(serverId: number) {
    await $fetch<ApiResponse>(`/api/servers/${serverId}`, {
      method: "DELETE",
    });
  },
  async get(serverId: number) {
    const response = await $fetch<ApiResponse>(`/api/servers/${serverId}`);
    return ServersAPI.GET.response.parse(response.data);
  },
  async gets() {
    const response = await $fetch<ApiResponse>("/api/servers");
    return ServersAPI.GETS.response.parse(response.data);
  },
  async post(data: z.infer<typeof ServersAPI.POST.request>) {
    await $fetch<ApiResponse>("/api/servers", {
      body: data,
      method: "POST",
    });
  },
};

export const NotifyData = {
  async patch(serverId: number, body: z.infer<typeof NotifyAPI.PATCH.request>) {
    await $fetch<ApiResponse>(`/api/servers/${serverId}/notify`, {
      body,
      method: "PATCH",
    });
  },
};

export const BotData = {
  async delete(botId: number) {
    await $fetch<ApiResponse>(`/api/bot/${botId}`, {
      method: "DELETE",
    });
  },
  async get(botId: number) {
    const response = await $fetch<ApiResponse>(`/api/bot/${botId}`);
    return BotAPI.GET.response.parse(response.data);
  },
  async getChannels(botId: number, platform: PlatformType) {
    const endpoint =
      platform === PlatformType.Onebot
        ? `/api/bot/${botId}/onebot-channels`
        : `/api/bot/${botId}/discord-channels`;
    const response = await $fetch<ApiResponse>(endpoint);
    return platform === PlatformType.Onebot
      ? BotAPI.ONEBOT_CHANNELS.response.parse(response.data)
      : BotAPI.DISCORD_CHANNELS.response.parse(response.data);
  },
  async getDiscordRoles(botId: number, guildId: string) {
    const response = await $fetch<ApiResponse>(
      `/api/bot/${botId}/discord-roles`,
      { query: { guildId } },
    );
    return BotAPI.DISCORD_ROLES.response.parse(response.data);
  },
  async gets() {
    const response = await $fetch<ApiResponse>("/api/bot");
    return BotAPI.GETS.response.parse(response.data);
  },
  async post(data: z.infer<typeof BotAPI.POST.request>) {
    await $fetch<ApiResponse>("/api/bot", {
      body: data,
      method: "POST",
    });
  },
  async postToggle(
    botId: number,
    data: z.infer<typeof BotAPI.POSTTOGGLE.request>,
  ) {
    await $fetch<ApiResponse>(`/api/bot/${botId}/toggle`, {
      body: data,
      method: "POST",
    });
  },
  async put(botId: number, data: z.infer<typeof BotAPI.PUT.request>) {
    await $fetch<ApiResponse>(`/api/bot/${botId}`, {
      body: data,
      method: "PUT",
    });
  },
};

export const TargetData = {
  async creates(
    serverId: number,
    payloads: z.infer<typeof TargetAPI.POST.request>,
  ) {
    const response = await $fetch<ApiResponse>(
      `/api/servers/${serverId}/targets`,
      {
        body: payloads,
        method: "POST",
      },
    );
    return TargetAPI.POST.response.parse(response.data);
  },
  async deletes(
    serverId: number,
    payloads: z.infer<typeof TargetAPI.DELETE.request>,
  ) {
    const response = await $fetch<ApiResponse>(
      `/api/servers/${serverId}/targets`,
      {
        body: payloads,
        method: "DELETE",
      },
    );
    return TargetAPI.DELETE.response.parse(response.data);
  },
  async gets(serverId: number) {
    const response = await $fetch<ApiResponse>(
      `/api/servers/${serverId}/targets`,
    );
    return TargetAPI.GETS.response.parse(response.data);
  },
  async updates(
    serverId: number,
    payloads: z.infer<typeof TargetAPI.PATCH.request>,
  ) {
    const response = await $fetch<ApiResponse>(
      `/api/servers/${serverId}/targets`,
      {
        body: payloads,
        method: "PATCH",
      },
    );
    return TargetAPI.PATCH.response.parse(response.data);
  },
};

export const ChatSyncData = {
  async patch(
    serverId: number,
    payloads: z.infer<typeof ChatSyncAPI.PATCH.request>,
  ) {
    await $fetch<ApiResponse>(`/api/servers/${serverId}/chat-sync`, {
      body: payloads,
      method: "PATCH",
    });
  },
};

export const GeneralData = {
  async patch(
    serverId: number,
    payloads: z.infer<typeof GeneralAPI.PATCH.request>,
  ) {
    await $fetch<ApiResponse>(`/api/servers/${serverId}/general`, {
      body: payloads,
      method: "PATCH",
    });
  },
};

export const CommandData = {
  async patch(
    serverId: number,
    payloads: z.infer<typeof CommandAPI.PATCH.request>,
  ) {
    await $fetch<ApiResponse>(`/api/servers/${serverId}/command`, {
      body: payloads,
      method: "PATCH",
    });
  },
};

export const BindingData = {
  async patch(
    serverId: number,
    payloads: z.infer<typeof BindingAPI.PATCH.request>,
  ) {
    await $fetch<ApiResponse>(`/api/servers/${serverId}/binding`, {
      body: payloads,
      method: "PATCH",
    });
  },
};

export const PlayerData = {
  async gets() {
    const response = await $fetch<ApiResponse>("/api/players");
    return PlayerAPI.GETS.response.parse(response.data);
  },
};

export const BrowserData = {
  async cancelDownload() {
    await $fetch<ApiResponse>("/api/settings/browser/download-cancel", {
      method: "POST",
    });
  },
  async checkUpdate() {
    const response = await $fetch<ApiResponse>(
      "/api/settings/browser/check-update",
    );
    return SettingsAPI.CHECK_UPDATE_GET.response.parse(response.data);
  },
  async get() {
    const response = await $fetch<ApiResponse>("/api/settings/browser");
    return SettingsAPI.GET.response.parse(response.data);
  },
  async patch(executablePath: string | null) {
    await $fetch<ApiResponse>("/api/settings/browser", {
      body: { executablePath },
      method: "PATCH",
    });
  },
  async startDownload() {
    await $fetch<ApiResponse>("/api/settings/browser/download", {
      method: "POST",
    });
  },
  useDownloadStream() {
    return useEventSource("/api/settings/browser/download-stream", [
      "progress",
    ]);
  },
};
