<template>
  <transition appear name="card-appear">
    <div
      :class="[
        'cursor-pointer transition-all duration-300 ease-in-out hover:-translate-y-1 hover:shadow-xl',
        { 'grayscale-[0.8]': !server.isOnline },
      ]"
      @click="router.push(`/servers/${server.id}`)"
    >
      <UCard>
        <div class="flex flex-col gap-4">
          <!-- 名称 + 状态 与 版本 -->
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2">
              <span class="text-lg font-semibold">{{ server.name }}</span>
              <UBadge
                :color="server.isOnline ? 'success' : 'error'"
                variant="subtle"
                size="sm"
              >
                {{ server.isOnline ? "在线" : "离线" }}
              </UBadge>
            </div>
            <UBadge
              :color="server.isOnline ? 'neutral' : 'warning'"
              variant="subtle"
              size="sm"
            >
              {{ getVersion(server.minecraft_version) }}
            </UBadge>
          </div>

          <!-- 服务器端 info -->
          <div class="flex items-center gap-2">
            <img
              :src="getSoftwareIcon(server.minecraft_software)"
              class="size-5 object-contain"
              alt="server software icon"
            />
            <span class="text-muted text-sm">{{
              server.minecraft_software || "未知服务器端"
            }}</span>
          </div>

          <!-- Token 框 -->
          <div class="flex flex-col gap-2">
            <span class="text-muted text-sm">Token:</span>
            <div class="flex gap-1">
              <UInput
                :value="showToken ? server.token : '•'.repeat(16)"
                class="flex-1"
                readonly
                @click.stop="copyTokenToClipboard"
              />
              <UButton
                icon="i-lucide-copy"
                color="neutral"
                variant="subtle"
                @click.stop="copyTokenToClipboard"
              />
            </div>
          </div>

          <span class="text-muted text-right text-xs opacity-70 select-none"
            >点击卡片查看更多信息</span
          >
        </div>
      </UCard>
    </div>
  </transition>
</template>

<script lang="ts" setup>
import type { z } from "zod";

import type { ServersAPI } from "#shared/model/server/servers";
import MinecraftDefaultIcon from "@/assets/icon/software/minecraft.svg";

const { server } = defineProps<{
  server: z.infer<(typeof ServersAPI)["GET"]["response"]>;
}>();

const toast = useToast();
const router = useRouter();
const showToken = ref(false);
const isCopying = ref(false);

const getVersion = (original: string | null): string => {
  if (!original) {
    return "未知版本";
  }

  const regex = /^([\d.]+-\d+-[a-f0-9]+)\s+\(MC:\s*([^)]+)\)/;
  const match = original.match(regex);

  if (match) {
    const mcVersion = match.at(2);
    return `v${mcVersion ?? ""}`;
  }
  return original;
};

const copyTokenToClipboard = async (e?: Event) => {
  // 防止传递点击事件
  if (e) {
    e.stopPropagation();
  }

  if (isCopying.value) {
    toast.add({ color: "warning", id: "copyed", title: "我*，这么快干什么！" });
    return;
  }

  isCopying.value = true;

  try {
    await navigator.clipboard.writeText(server.token);
    toast.add({
      color: "success",
      duration: 3000,
      title: "Token 被剪贴板带跑啦，3 秒后消失~",
    });
    showToken.value = true;
    setTimeout(() => {
      showToken.value = false;
      isCopying.value = false;
    }, 3000);
  } catch {
    toast.add({ color: "error", title: "复制失败，小 clipboard 罢工了！" });
    isCopying.value = false;
  }
};

const getSoftwareIcon = (software: string | null) => {
  switch (software) {
    case "Paper": {
      return "https://assets.papermc.io/brand/papermc_logo.min.svg";
    }
    case "Leaf": {
      return "https://www.leafmc.one/logo.svg";
    }
    case "Leaves": {
      return "https://leavesmc.org/favicon.ico";
    }
    case "Purpur": {
      return "https://purpurmc.org/favicon.ico";
    }
    case "Spigot": {
      return "https://static.spigotmc.org/img/spigot.png";
    }
    case "Bukkit": {
      return "https://bukkit.org/favicon.ico";
    }
    case "Fabric": {
      return "https://fabricmc.net/assets/logo.png";
    }
    case "Canvas": {
      return "https://canvasmc.io/favicon.ico";
    }
    case "Velocity": {
      return "https://assets.papermc.io/brand/velocity_logo_blue.min.svg";
    }
    default: {
      return MinecraftDefaultIcon;
    }
  }
};
</script>

<style scoped>
/* 动画 */
.card-appear-enter-active {
  transition: all 0.6s cubic-bezier(0.23, 1, 0.32, 1);
}

.card-appear-enter-from {
  opacity: 0;
  transform: scale(0.8) translateY(20px);
}

.card-appear-enter-to {
  opacity: 1;
  transform: scale(1) translateY(0);
}
</style>
