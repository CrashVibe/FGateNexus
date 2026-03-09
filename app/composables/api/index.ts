import type { z } from "zod";
import { AdapterAPI } from "~~/shared/schemas/adapter";
import { PlayerAPI } from "~~/shared/schemas/player";
import { BindingAPI } from "~~/shared/schemas/server/binding";
import { ChatSyncAPI } from "~~/shared/schemas/server/chat-sync";
import { CommandAPI } from "~~/shared/schemas/server/command";
import { GeneralAPI } from "~~/shared/schemas/server/general";
import type { NotifyAPI } from "~~/shared/schemas/server/notify";
import { ServersAPI } from "~~/shared/schemas/server/servers";
import { TargetAPI } from "~~/shared/schemas/server/target";
import { SettingsAPI } from "~~/shared/schemas/settings";
import type { ApiResponse } from "~~/shared/types";

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
    const response = await $fetch<ApiResponse>("/api/servers", {
      body: ServersAPI.POST.request.parse(data),
      method: "POST",
    });
    return response;
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

export const AdapterData = {
  async delete(adapterId: number) {
    await $fetch<ApiResponse>(`/api/adapter/${adapterId}`, {
      method: "DELETE",
    });
  },
  async get(adapterId: number) {
    const response = await $fetch<ApiResponse>(`/api/adapter/${adapterId}`);
    return AdapterAPI.GET.response.parse(response.data);
  },
  async gets() {
    const response = await $fetch<ApiResponse>("/api/adapter");
    return AdapterAPI.GETS.response.parse(response.data);
  },
  async post(data: z.infer<typeof AdapterAPI.POST.request>) {
    await $fetch<ApiResponse>("/api/adapter", {
      body: AdapterAPI.POST.request.parse(data),
      method: "POST",
    });
  },
  async postToggle(
    adapterId: number,
    data: z.infer<typeof AdapterAPI.POSTTOGGLE.request>,
  ) {
    await $fetch<ApiResponse>(`/api/adapter/${adapterId}/toggle`, {
      body: AdapterAPI.POSTTOGGLE.request.parse(data),
      method: "POST",
    });
  },
  async put(adapterId: number, data: z.infer<typeof AdapterAPI.PUT.request>) {
    await $fetch<ApiResponse>(`/api/adapter/${adapterId}`, {
      body: AdapterAPI.PUT.request.parse(data),
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
        body: TargetAPI.POST.request.parse(payloads),
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
        body: TargetAPI.DELETE.request.parse(payloads),
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
        body: TargetAPI.PATCH.request.parse(payloads),
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
      body: ChatSyncAPI.PATCH.request.parse(payloads),
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
      body: GeneralAPI.PATCH.request.parse(payloads),
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
      body: CommandAPI.PATCH.request.parse(payloads),
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
      body: BindingAPI.PATCH.request.parse(payloads),
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
  async getDownloadProgress() {
    const response = await $fetch<ApiResponse>(
      "/api/settings/browser/download-progress",
    );
    return SettingsAPI.DOWNLOAD_PROGRESS_GET.response.parse(response.data);
  },
  async patch(executablePath: string | null) {
    await $fetch<ApiResponse>("/api/settings/browser", {
      body: SettingsAPI.PATCH.request.parse({ executablePath }),
      method: "PATCH",
    });
  },
  async startDownload() {
    await $fetch<ApiResponse>("/api/settings/browser/download", {
      method: "POST",
    });
  },
};
