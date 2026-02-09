import type z from "zod";
import { AdapterAPI } from "~~/shared/schemas/adapter";
import { PlayerAPI } from "~~/shared/schemas/player";
import { BindingAPI } from "~~/shared/schemas/server/binding";
import { ChatSyncAPI } from "~~/shared/schemas/server/chatSync";
import { CommandAPI } from "~~/shared/schemas/server/command";
import { GeneralAPI } from "~~/shared/schemas/server/general";
import type { NotifyAPI } from "~~/shared/schemas/server/notify";
import { ServersAPI } from "~~/shared/schemas/server/servers";
import { TargetAPI } from "~~/shared/schemas/server/target";
import type { ApiResponse } from "~~/shared/types";

export const ServerData = {
  async get(serverId: number) {
    const response = await $fetch<ApiResponse>("/api/servers/" + serverId);
    return ServersAPI.GET.response.parse(response.data);
  },
  async gets() {
    const response = await $fetch<ApiResponse>("/api/servers");
    return ServersAPI.GETS.response.parse(response.data);
  },
  async post(data: z.infer<typeof ServersAPI.POST.request>) {
    const response = await $fetch<ApiResponse>("/api/servers", {
      method: "POST",
      body: ServersAPI.POST.request.parse(data)
    });
    return response;
  },
  async delete(serverId: number) {
    await $fetch<ApiResponse>(`/api/servers/${serverId}`, {
      method: "DELETE"
    });
  }
};

export const NotifyData = {
  async patch(serverId: number, body: z.infer<typeof NotifyAPI.PATCH.request>) {
    await $fetch<ApiResponse>(`/api/servers/${serverId}/notify`, { method: "PATCH", body });
  }
};

export const AdapterData = {
  async get(adapterId: number) {
    const response = await $fetch<ApiResponse>("/api/adapter/" + adapterId);
    return AdapterAPI.GET.response.parse(response.data);
  },
  async gets() {
    const response = await $fetch<ApiResponse>("/api/adapter");
    return AdapterAPI.GETS.response.parse(response.data);
  },
  async post(data: z.infer<typeof AdapterAPI.POST.request>) {
    await $fetch<ApiResponse>("/api/adapter", {
      method: "POST",
      body: AdapterAPI.POST.request.parse(data)
    });
  },
  async postToggle(adapterId: number, data: z.infer<typeof AdapterAPI.POSTTOGGLE.request>) {
    await $fetch<ApiResponse>(`/api/adapter/${adapterId}/toggle`, {
      method: "POST",
      body: AdapterAPI.POSTTOGGLE.request.parse(data)
    });
  },
  async put(adapterId: number, data: z.infer<typeof AdapterAPI.PUT.request>) {
    await $fetch<ApiResponse>(`/api/adapter/${adapterId}`, {
      method: "PUT",
      body: AdapterAPI.PUT.request.parse(data)
    });
  },
  async delete(adapterId: number) {
    await $fetch<ApiResponse>(`/api/adapter/${adapterId}`, {
      method: "DELETE"
    });
  }
};

export const TargetData = {
  async gets(serverId: number) {
    const response = await $fetch<ApiResponse>(`/api/servers/${serverId}/targets`);
    console.log(response.data);
    return TargetAPI.GETS.response.parse(response.data);
  },
  async creates(serverId: number, payloads: z.infer<typeof TargetAPI.POST.request>) {
    const response = await $fetch<ApiResponse>(`/api/servers/${serverId}/targets`, {
      method: "POST",
      body: TargetAPI.POST.request.parse(payloads)
    });
    return TargetAPI.POST.response.parse(response.data);
  },
  async updates(serverId: number, payloads: z.infer<typeof TargetAPI.PATCH.request>) {
    const response = await $fetch<ApiResponse>(`/api/servers/${serverId}/targets`, {
      method: "PATCH",
      body: TargetAPI.PATCH.request.parse(payloads)
    });
    return TargetAPI.PATCH.response.parse(response.data);
  },
  async deletes(serverId: number, payloads: z.infer<typeof TargetAPI.DELETE.request>) {
    const response = await $fetch<ApiResponse>(`/api/servers/${serverId}/targets`, {
      method: "DELETE",
      body: TargetAPI.DELETE.request.parse(payloads)
    });
    return TargetAPI.DELETE.response.parse(response.data);
  }
};

export const ChatSyncData = {
  async patch(serverId: number, payloads: z.infer<typeof ChatSyncAPI.PATCH.request>) {
    await $fetch<ApiResponse>(`/api/servers/${serverId}/chatSync`, {
      method: "PATCH",
      body: ChatSyncAPI.PATCH.request.parse(payloads)
    });
  }
};

export const GeneralData = {
  async patch(serverId: number, payloads: z.infer<typeof GeneralAPI.PATCH.request>) {
    await $fetch<ApiResponse>(`/api/servers/${serverId}/general`, {
      method: "PATCH",
      body: GeneralAPI.PATCH.request.parse(payloads)
    });
  }
};

export const CommandData = {
  async patch(serverId: number, payloads: z.infer<typeof CommandAPI.PATCH.request>) {
    await $fetch<ApiResponse>(`/api/servers/${serverId}/command`, {
      method: "PATCH",
      body: CommandAPI.PATCH.request.parse(payloads)
    });
  }
};

export const BindingData = {
  async patch(serverId: number, payloads: z.infer<typeof BindingAPI.PATCH.request>) {
    await $fetch<ApiResponse>(`/api/servers/${serverId}/binding`, {
      method: "PATCH",
      body: BindingAPI.PATCH.request.parse(payloads)
    });
  }
};

export const PlayerData = {
  async gets() {
    const response = await $fetch<ApiResponse>("/api/players");
    return PlayerAPI.GETS.response.parse(response.data);
  }
};