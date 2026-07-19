import type { z } from "zod";

import type { LoginAPI, PasswordAPI } from "#shared/model/auth/api";
import type { AuthStatus } from "#shared/model/auth/schema";
import { BotAPI } from "#shared/model/bot/api";
import { PlatformType } from "#shared/model/bot/types";
import { PlayerAPI } from "#shared/model/player/api";
import type {
  BindingAPI,
  ChatSyncAPI,
  CommandAPI,
  GeneralAPI,
  NotifyAPI,
} from "#shared/model/server/api";
import { ServersAPI, TargetAPI } from "#shared/model/server/api";
import { SettingsAPI } from "#shared/model/settings";
import { TemplateAPI, TemplateInstanceAPI } from "#shared/model/template/api";
import type {
  TemplateInstanceConfig,
  TemplateInstanceCreate,
  TemplateInstanceUpdate,
} from "#shared/model/template/schema/instance";

import { request, throwIfNotOk, uploadFile } from "./http";

export const AuthData = {
  async deletePassword(currentPassword: string): Promise<void> {
    await request("/api/auth/password", {
      body: { currentPassword },
      method: "DELETE",
    });
  },
  async getStatus(): Promise<AuthStatus | undefined> {
    const response = await request<AuthStatus>("/api/auth/status");
    return response.data;
  },
  async login(data: z.infer<typeof LoginAPI.POST.request>): Promise<void> {
    await request("/api/auth/login", { body: data, method: "POST" });
  },
  async logout(): Promise<void> {
    await request("/api/auth/logout", { method: "POST" });
  },
  async remove2FA(): Promise<void> {
    await request("/api/auth/2fa", { method: "DELETE" });
  },
  async setPassword(
    body: z.infer<typeof PasswordAPI.POST.request>,
  ): Promise<void> {
    await request("/api/auth/password", { body, method: "POST" });
  },
  async setup2FA(): Promise<{ keyuri: string; secret: string } | undefined> {
    const response = await request<{ keyuri: string; secret: string }>(
      "/api/auth/2fa/setup",
    );
    return response.data;
  },
  async verify2FA(secret: string, token: string): Promise<void> {
    await request("/api/auth/2fa/verify", {
      body: { secret, token },
      method: "POST",
    });
  },
};

export const ServerData = {
  async delete(serverId: number): Promise<void> {
    await request(`/api/servers/${serverId}`, { method: "DELETE" });
  },
  async get(
    serverId: number,
  ): Promise<z.infer<typeof ServersAPI.GET.response>> {
    const response = await request(`/api/servers/${serverId}`);
    return ServersAPI.GET.response.parse(response.data);
  },
  async gets(): Promise<z.infer<typeof ServersAPI.GETS.response>> {
    const response = await request("/api/servers");
    return ServersAPI.GETS.response.parse(response.data);
  },
  async post(data: z.infer<typeof ServersAPI.POST.request>): Promise<void> {
    await request("/api/servers", { body: data, method: "POST" });
  },
};

export const NotifyData = {
  async patch(
    serverId: number,
    body: z.infer<typeof NotifyAPI.PATCH.request>,
  ): Promise<void> {
    await request(`/api/servers/${serverId}/notify`, { body, method: "PATCH" });
  },
};

export const BotData = {
  async delete(botId: number): Promise<void> {
    await request(`/api/bot/${botId}`, { method: "DELETE" });
  },
  async get(botId: number): Promise<z.infer<typeof BotAPI.GET.response>> {
    const response = await request(`/api/bot/${botId}`);
    return BotAPI.GET.response.parse(response.data);
  },
  async getChannels(
    botId: number,
    platform: PlatformType,
  ): Promise<
    | z.infer<typeof BotAPI.ONEBOT_CHANNELS.response>
    | z.infer<typeof BotAPI.DISCORD_CHANNELS.response>
  > {
    const endpoint =
      platform === PlatformType.Onebot
        ? `/api/bot/${botId}/onebot-channels`
        : `/api/bot/${botId}/discord-channels`;
    const response = await request(endpoint);
    return platform === PlatformType.Onebot
      ? BotAPI.ONEBOT_CHANNELS.response.parse(response.data)
      : BotAPI.DISCORD_CHANNELS.response.parse(response.data);
  },
  async getDiscordRoles(
    botId: number,
    guildId: string,
  ): Promise<z.infer<typeof BotAPI.DISCORD_ROLES.response>> {
    const response = await request(`/api/bot/${botId}/discord-roles`, {
      query: { guildId },
    });
    return BotAPI.DISCORD_ROLES.response.parse(response.data);
  },
  async gets(): Promise<z.infer<typeof BotAPI.GETS.response>> {
    const response = await request("/api/bot");
    return BotAPI.GETS.response.parse(response.data);
  },
  async post(data: z.infer<typeof BotAPI.POST.request>): Promise<void> {
    await request("/api/bot", { body: data, method: "POST" });
  },
  async postToggle(
    botId: number,
    data: z.infer<typeof BotAPI.POSTTOGGLE.request>,
  ): Promise<void> {
    await request(`/api/bot/${botId}/toggle`, { body: data, method: "POST" });
  },
  async put(
    botId: number,
    data: z.infer<typeof BotAPI.PUT.request>,
  ): Promise<void> {
    await request(`/api/bot/${botId}`, { body: data, method: "PUT" });
  },
};

export const TargetData = {
  async creates(
    serverId: number,
    payloads: z.infer<typeof TargetAPI.POST.request>,
  ): Promise<z.infer<typeof TargetAPI.POST.response>> {
    const response = await request(`/api/servers/${serverId}/targets`, {
      body: payloads,
      method: "POST",
    });
    return TargetAPI.POST.response.parse(response.data);
  },
  async deletes(
    serverId: number,
    payloads: z.infer<typeof TargetAPI.DELETE.request>,
  ): Promise<z.infer<typeof TargetAPI.DELETE.response>> {
    const response = await request(`/api/servers/${serverId}/targets`, {
      body: payloads,
      method: "DELETE",
    });
    return TargetAPI.DELETE.response.parse(response.data);
  },
  async gets(
    serverId: number,
  ): Promise<z.infer<typeof TargetAPI.GETS.response>> {
    const response = await request(`/api/servers/${serverId}/targets`);
    return TargetAPI.GETS.response.parse(response.data);
  },
  async updates(
    serverId: number,
    payloads: z.infer<typeof TargetAPI.PATCH.request>,
  ): Promise<z.infer<typeof TargetAPI.PATCH.response>> {
    const response = await request(`/api/servers/${serverId}/targets`, {
      body: payloads,
      method: "PATCH",
    });
    return TargetAPI.PATCH.response.parse(response.data);
  },
};

export const ChatSyncData = {
  async patch(
    serverId: number,
    payloads: z.infer<typeof ChatSyncAPI.PATCH.request>,
  ): Promise<void> {
    await request(`/api/servers/${serverId}/chat-sync`, {
      body: payloads,
      method: "PATCH",
    });
  },
};

export const GeneralData = {
  async patch(
    serverId: number,
    payloads: z.infer<typeof GeneralAPI.PATCH.request>,
  ): Promise<void> {
    await request(`/api/servers/${serverId}/general`, {
      body: payloads,
      method: "PATCH",
    });
  },
};

export const CommandData = {
  async patch(
    serverId: number,
    payloads: z.infer<typeof CommandAPI.PATCH.request>,
  ): Promise<void> {
    await request(`/api/servers/${serverId}/command`, {
      body: payloads,
      method: "PATCH",
    });
  },
};

export const BindingData = {
  async patch(
    serverId: number,
    payloads: z.infer<typeof BindingAPI.PATCH.request>,
  ): Promise<void> {
    await request(`/api/servers/${serverId}/binding`, {
      body: payloads,
      method: "PATCH",
    });
  },
};

export const PlayerData = {
  async gets(): Promise<z.infer<typeof PlayerAPI.GETS.response>> {
    const response = await request("/api/players");
    return PlayerAPI.GETS.response.parse(response.data);
  },
};

export const BrowserData = {
  async cancelDownload(): Promise<void> {
    await request("/api/settings/browser/download-cancel", { method: "POST" });
  },
  async checkUpdate(): Promise<
    z.infer<typeof SettingsAPI.CHECK_UPDATE_GET.response>
  > {
    const response = await request("/api/settings/browser/check-update");
    return SettingsAPI.CHECK_UPDATE_GET.response.parse(response.data);
  },
  async get(): Promise<z.infer<typeof SettingsAPI.GET.response>> {
    const response = await request("/api/settings/browser");
    return SettingsAPI.GET.response.parse(response.data);
  },
  async patch(executablePath: string | null): Promise<void> {
    await request("/api/settings/browser", {
      body: { executablePath },
      method: "PATCH",
    });
  },
  async startDownload(): Promise<void> {
    await request("/api/settings/browser/download", { method: "POST" });
  },
};

export const TemplateData = {
  async delete(id: string): Promise<void> {
    await request(`/api/templates/${id}`, { method: "DELETE" });
  },
  async get(id: string): Promise<z.infer<typeof TemplateAPI.GET.response>> {
    const response = await request(`/api/templates/${id}`);
    return TemplateAPI.GET.response.parse(response.data);
  },
  async gets(): Promise<z.infer<typeof TemplateAPI.GETS.response>> {
    const response = await request("/api/templates");
    return TemplateAPI.GETS.response.parse(response.data);
  },
  async upload(
    file: File,
  ): Promise<z.infer<typeof TemplateAPI.UPLOAD.response>> {
    const response = await uploadFile("/api/templates", file);
    return TemplateAPI.UPLOAD.response.parse(response.data);
  },
};

export const TemplateInstanceData = {
  async create(
    serverId: number,
    body: TemplateInstanceCreate,
  ): Promise<z.infer<typeof TemplateInstanceAPI.POST.response>> {
    const response = await request(
      `/api/servers/${serverId}/template-instances`,
      { body, method: "POST" },
    );
    return TemplateInstanceAPI.POST.response.parse(response.data);
  },
  async delete(serverId: number, instanceId: string): Promise<void> {
    await request(`/api/servers/${serverId}/template-instances/${instanceId}`, {
      method: "DELETE",
    });
  },
  async gets(
    serverId: number,
  ): Promise<z.infer<typeof TemplateInstanceAPI.GETS.response>> {
    const response = await request(
      `/api/servers/${serverId}/template-instances`,
    );
    return TemplateInstanceAPI.GETS.response.parse(response.data);
  },
  /** 失败时抛 ApiRequestError。 */
  async render(serverId: number, instanceId: string): Promise<Blob> {
    const res = await fetch(
      `/api/servers/${serverId}/template-instances/${instanceId}/render`,
      { credentials: "same-origin", method: "POST" },
    );
    await throwIfNotOk(res);
    return await res.blob();
  },
  /** 用未保存的配置渲染；失败时抛 ApiRequestError。 */
  async renderPreview(
    serverId: number,
    templateId: string,
    config: TemplateInstanceConfig,
    signal?: AbortSignal,
  ): Promise<Blob> {
    const res = await fetch(
      `/api/servers/${serverId}/template-instances/render-preview`,
      {
        body: JSON.stringify({ config, templateId }),
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        method: "POST",
        signal,
      },
    );
    await throwIfNotOk(res);
    return await res.blob();
  },
  async update(
    serverId: number,
    instanceId: string,
    body: TemplateInstanceUpdate,
  ): Promise<z.infer<typeof TemplateInstanceAPI.PATCH.response>> {
    const response = await request(
      `/api/servers/${serverId}/template-instances/${instanceId}`,
      { body, method: "PATCH" },
    );
    return TemplateInstanceAPI.PATCH.response.parse(response.data);
  },
};

export { PlatformType };
