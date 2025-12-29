<template>
  <transition appear name="card-appear">
    <n-card
      :class="{ 'grayscale-[0.6]': !server.isOnline }"
      class="transition-all duration-300 ease-in-out cursor-pointer hover:-translate-y-1 hover:shadow-xl"
      hoverable
      @click="router.push(`/servers/${props.server.id}`)"
    >
      <div class="flex flex-col gap-4">
        <!-- 名称 + 状态 与 版本 -->
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2">
            <n-text class="text-lg" strong>{{ server.name }}</n-text>
            <n-tag :bordered="false" :type="server.isOnline ? 'success' : 'error'" size="small">
              {{ server.isOnline ? "在线" : "离线" }}
            </n-tag>
          </div>
          <n-tag :bordered="false" :type="server.isOnline ? 'default' : 'warning'" size="small">
            {{ getVersion(server.minecraft_version) }}
          </n-tag>
        </div>

        <!-- 服务器端 info -->
        <div class="flex items-center gap-2">
          <n-image :src="getSoftwareIcon(server.minecraft_software)" class="size-5" preview-disabled />
          <n-text :depth="3">{{ server.minecraft_software || "未知服务器端" }}</n-text>
        </div>

        <!-- Token 框 -->
        <div class="flex flex-col gap-2">
          <div class="flex items-center gap-2">
            <n-text :depth="3" class="text-sm">Token:</n-text>
          </div>
          <n-input-group>
            <n-input
              :depth="showToken ? 3 : 2"
              :value="showToken ? server.token : '•'.repeat(16)"
              readonly
              size="medium"
              @click="copyTokenToClipboard"
            />
            <n-button size="medium" tertiary type="primary" @click.stop="copyTokenToClipboard">
              <template #icon>
                <n-icon>
                  <svg height="1em" viewBox="0 0 24 24" width="1em" xmlns="http://www.w3.org/2000/svg">
                    <path
                      d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"
                      fill="currentColor"
                    />
                  </svg>
                </n-icon>
              </template>
            </n-button>
          </n-input-group>
        </div>

        <n-text class="text-xs text-right select-none opacity-70" depth="3">点击卡片查看更多信息</n-text>
      </div>
    </n-card>
  </transition>
</template>

<script lang="ts" setup>
import type { ServerWithStatus } from "#shared/schemas/server/servers";
import MinecraftDefaultIcon from "@/assets/icon/software/minecraft.svg";

const props = defineProps<{
  server: ServerWithStatus;
}>();

const message = useMessage();
const router = useRouter();
const showToken = ref(false);
const isCopying = ref(false);

function getVersion(original: string | null): string {
  if (!original) {
    return "未知版本";
  }

  const regex = /^([\d.]+-\d+-[a-f0-9]+)\s+\(MC:\s*([^)]+)\)/;
  const match = original.match(regex);

  if (match) {
    const mcVersion = match[2];
    return "v" + mcVersion;
  }
  return original;
}

function copyTokenToClipboard(e?: Event) {
  if (e) {
    e.stopPropagation(); // 防止传递点击事件
  }

  if (isCopying.value) {
    message.warning("我**，这么快干什么！");
    return;
  }

  isCopying.value = true;

  navigator.clipboard
    .writeText(props.server.token)
    .then(() => {
      message.success("Token 被剪贴板带跑啦，3 秒后消失~");
      showToken.value = true;
      setTimeout(() => {
        showToken.value = false;
        isCopying.value = false;
      }, 3000);
    })
    .catch(() => {
      message.error("复制失败，小 clipboard 罢工了！");
      isCopying.value = false;
    });
}

const getSoftwareIcon = (software: string | null) => {
  switch (software) {
    case "Paper":
      return "https://assets.papermc.io/brand/papermc_logo.min.svg";
    case "Leaf":
      return "https://www.leafmc.one/logo.svg";
    case "Leaves":
      return "https://leavesmc.org/favicon.ico";
    case "Purpur":
      return "https://purpurmc.org/favicon.ico";
    case "Spigot":
      return "https://static.spigotmc.org/img/spigot.png";
    case "Bukkit":
      return "https://bukkit.org/favicon.ico";
    case "Fabric":
      return "https://fabricmc.net/assets/logo.png";
    case "Canvas":
      return "https://canvasmc.io/favicon.ico";
    case "Velocity":
      return "https://assets.papermc.io/brand/velocity_logo_blue.min.svg";
    default:
      return MinecraftDefaultIcon;
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
