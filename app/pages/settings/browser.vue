<script lang="ts" setup>
import { clamp } from "lodash-es";
import { FetchError } from "ofetch";
import type {
  DownloadState,
  DownloadStatus,
} from "~~/server/service/browser-downloader";

import { BrowserData } from "@/composables/api";

// ─── 常量 ───────────────────────────────────────────────────────────────────

const ACTIVE_STATUSES = new Set<DownloadStatus>([
  "resolving",
  "downloading",
  "unpacking",
]);

const IDLE_STATE: DownloadState = {
  buildId: "",
  downloadedBytes: 0,
  platform: "",
  status: "idle",
  totalBytes: 0,
};

const toMB = (b: number) => (b / 1024 / 1024).toFixed(1);

const fetchErrorMsg = (error: unknown) =>
  error instanceof FetchError
    ? ((error.data as { message?: string })?.message ?? error.message)
    : String(error);

// ─── 类型 ───────────────────────────────────────────────────────────────────

interface UpdateInfo {
  currentBuildId: string | null;
  hasUpdate: boolean;
  latestBuildId: string;
}

type Mode = "download" | "custom";

// ─── 状态 ────────────────────────────────────────────────────────────────────

const toast = useToast();
const mode = ref<Mode>("download");
const isLoading = ref(false);
const currentConfig = ref<{
  executablePath: string | null;
}>({ executablePath: null });
const customPath = ref("");
const isSavingPath = ref(false);
const downloadState = ref<DownloadState>({ ...IDLE_STATE });
const isStartingDownload = ref(false);
const updateInfo = ref<UpdateInfo | null>(null);
const isCheckingUpdate = ref(false);

// 轮询控制
let progressTimer: ReturnType<typeof setInterval> | null = null;
let isFetchingProgress = false;
const wasActiveDownload = ref(false);

// ─── 计算属性 ─────────────────────────────────────────────────────────────────

const isDownloading = computed(() =>
  ACTIVE_STATUSES.has(downloadState.value.status),
);

const downloadProgress = computed(() => {
  const { downloadedBytes, totalBytes } = downloadState.value;
  if (!totalBytes) {
    return 0;
  }
  return clamp(Math.round((downloadedBytes / totalBytes) * 100), 0, 100);
});

const downloadProgressColor = computed<
  "primary" | "success" | "error" | "warning" | "neutral"
>(() => {
  if (downloadState.value.status === "done") {
    return "success";
  }
  if (downloadState.value.status === "error") {
    return "error";
  }
  return "primary";
});

const downloadStatusText = computed(() => {
  const { status, downloadedBytes, totalBytes } = downloadState.value;
  const statusMap: Partial<Record<DownloadStatus, string>> = {
    done: "下载完成！",
    idle: "等待下载",
    resolving: "正在获取最新版本信息...",
    unpacking: "正在解压安装...",
  };
  if (status === "downloading") {
    return totalBytes > 0
      ? `下载中 ${toMB(downloadedBytes)} / ${toMB(totalBytes)} MB (${downloadProgress.value}%)`
      : "下载中...";
  }
  if (status === "error") {
    return `下载失败：${downloadState.value.error ?? "未知错误"}`;
  }
  return statusMap[status] ?? "";
});

// ─── 方法 ─────────────────────────────────────────────────────────────────────

const stopPolling = () => {
  if (progressTimer !== null) {
    clearInterval(progressTimer);
    progressTimer = null;
  }
};

const loadConfig = async () => {
  isLoading.value = true;
  try {
    const data = await BrowserData.get();
    currentConfig.value = data ?? { executablePath: null };
  } catch {
    toast.add({ color: "error", title: "加载配置失败" });
  } finally {
    isLoading.value = false;
  }
};

const fetchProgress = async () => {
  if (isFetchingProgress) {
    return;
  }
  isFetchingProgress = true;
  try {
    const data = await BrowserData.getDownloadProgress();
    if (!data) {
      return;
    }
    if (ACTIVE_STATUSES.has(data.status)) {
      wasActiveDownload.value = true;
    }
    downloadState.value = data;
    if (!ACTIVE_STATUSES.has(data.status)) {
      stopPolling();
      if (data.status === "done" && wasActiveDownload.value) {
        toast.add({
          color: "success",
          description: `已安装到：${data.executablePath ?? ""}`,
          title: "Chromium 下载完成",
        });
        void loadConfig();
      } else if (data.status === "error" && wasActiveDownload.value) {
        toast.add({
          color: "error",
          description: data.error,
          title: "下载失败",
        });
      }
      wasActiveDownload.value = false;
    }
  } catch {
    // ignore poll errors
  } finally {
    isFetchingProgress = false;
  }
};

const startProgressStream = () => {
  stopPolling();
  progressTimer = setInterval(() => {
    void fetchProgress();
  }, 800);
};

const startDownload = async () => {
  isStartingDownload.value = true;
  try {
    await BrowserData.startDownload();
    wasActiveDownload.value = true;
    downloadState.value = { ...IDLE_STATE, status: "resolving" };
    startProgressStream();
  } catch (error) {
    toast.add({
      color: "error",
      description: fetchErrorMsg(error),
      title: "启动下载失败",
    });
  } finally {
    isStartingDownload.value = false;
  }
};

const cancelDownload = async () => {
  try {
    await BrowserData.cancelDownload();
    stopPolling();
    wasActiveDownload.value = false;
    downloadState.value = { ...IDLE_STATE };
    toast.add({ color: "neutral", title: "下载已取消" });
  } catch {
    toast.add({ color: "error", title: "取消失败" });
  }
};

const saveCustomPath = async () => {
  if (!customPath.value.trim()) {
    toast.add({ color: "warning", title: "请输入浏览器可执行文件路径" });
    return;
  }
  isSavingPath.value = true;
  try {
    await BrowserData.patch(customPath.value.trim());
    toast.add({ color: "success", title: "浏览器路径已保存" });
    await loadConfig();
  } catch (error) {
    toast.add({
      color: "error",
      description: fetchErrorMsg(error),
      title: "保存失败",
    });
  } finally {
    isSavingPath.value = false;
  }
};

const clearPath = async () => {
  isSavingPath.value = true;
  try {
    await BrowserData.patch(null);
    customPath.value = "";
    toast.add({ color: "success", title: "已清除自定义路径，将使用自动检测" });
    await loadConfig();
  } catch {
    toast.add({ color: "error", title: "操作失败" });
  } finally {
    isSavingPath.value = false;
  }
};

const checkUpdate = async () => {
  isCheckingUpdate.value = true;
  try {
    updateInfo.value = (await BrowserData.checkUpdate()) ?? null;
  } catch {
    toast.add({ color: "error", title: "检查更新失败" });
  } finally {
    isCheckingUpdate.value = false;
  }
};

// ─── 生命周期 ─────────────────────────────────────────────────────────────────

onMounted(async () => {
  await loadConfig();
  try {
    const initialData = await BrowserData.getDownloadProgress();
    if (initialData) {
      downloadState.value = initialData;
      if (ACTIVE_STATUSES.has(initialData.status)) {
        wasActiveDownload.value = true;
        startProgressStream();
      }
    }
  } catch {
    // ignore
  }
});

onUnmounted(() => {
  stopPolling();
});
</script>

<template>
  <div class="flex flex-col gap-4">
    <!-- 当前状态 -->
    <UPageCard icon="i-lucide-chrome" title="Chromium 浏览器" variant="outline">
      <template #description>
        <span
          class="text-muted inline-flex flex-wrap items-center gap-1.5 text-sm"
        >
          图片渲染功能需要 Chromium。当前状态：
          <UBadge
            v-if="currentConfig.executablePath"
            color="success"
            variant="subtle"
          >
            已配置
          </UBadge>
          <UBadge v-else color="warning" variant="subtle"> 未配置 </UBadge>
        </span>
      </template>
      <template #footer>
        <div class="flex w-full flex-col gap-2">
          <div
            v-if="currentConfig.executablePath"
            class="bg-muted/30 flex items-start gap-2 overflow-hidden rounded-md px-3 py-2 font-mono text-sm"
          >
            <UIcon
              name="i-lucide-file-cog"
              class="text-muted mt-0.5 shrink-0"
            />
            <span class="text-muted min-w-0 break-all">{{
              currentConfig.executablePath
            }}</span>
          </div>
          <UAlert
            v-else
            color="info"
            variant="subtle"
            icon="i-lucide-info"
            description="未设置自定义路径。系统将自动检测已下载的 Chromium，或你可以在下方下载/设置。"
          />
        </div>
      </template>
    </UPageCard>

    <!-- 模式选择 -->
    <UTabs
      v-model="mode"
      :items="[
        { label: '自动下载', value: 'download', icon: 'i-lucide-download' },
        {
          label: '手动指定路径',
          value: 'custom',
          icon: 'i-lucide-folder-open',
        },
      ]"
    />

    <!-- 下载模式 -->
    <template v-if="mode === 'download'">
      <UPageCard
        icon="i-lucide-download-cloud"
        title="下载 Chromium"
        variant="outline"
      >
        <template #description>
          <span class="text-muted text-sm">
            自动下载适合当前系统的 Chromium，并保存至
            <code class="bg-muted/50 rounded px-1 text-xs"
              >./data/browsers/</code
            >
            。检测到已安装时可重新下载以获取最新版本。
          </span>
        </template>

        <template #footer>
          <div class="flex w-full flex-col gap-4">
            <!-- 进度区 -->
            <template
              v-if="
                isDownloading ||
                (wasActiveDownload &&
                  (downloadState.status === 'done' ||
                    downloadState.status === 'error'))
              "
            >
              <div class="flex flex-col gap-2">
                <div class="flex items-center justify-between text-sm">
                  <span class="text-muted">{{ downloadStatusText }}</span>
                  <span
                    v-if="
                      downloadState.status === 'downloading' &&
                      downloadState.totalBytes > 0
                    "
                    class="text-muted font-mono text-xs"
                  >
                    {{ downloadProgress }}%
                  </span>
                </div>
                <UProgress
                  :model-value="
                    downloadState.status === 'unpacking'
                      ? null
                      : downloadProgress
                  "
                  :color="downloadProgressColor"
                  size="sm"
                  :animation="
                    downloadState.status === 'unpacking'
                      ? 'carousel'
                      : undefined
                  "
                />
                <div
                  v-if="downloadState.buildId"
                  class="text-muted flex gap-4 text-xs"
                >
                  <span>版本：{{ downloadState.buildId }}</span>
                  <span>平台：{{ downloadState.platform }}</span>
                </div>
              </div>
            </template>

            <template v-else>
              <div class="text-muted text-sm">
                将自动选择适合当前系统的版本下载并安装，速度取决于网络环境。
              </div>
            </template>

            <!-- 按钮组 -->
            <div class="flex flex-wrap gap-2">
              <UButton
                v-if="!isDownloading"
                icon="i-lucide-download"
                :loading="isStartingDownload"
                @click="startDownload"
              >
                {{ downloadState.status === "done" ? "重新下载" : "开始下载" }}
              </UButton>
              <UButton
                v-if="isDownloading"
                color="error"
                variant="subtle"
                icon="i-lucide-x"
                @click="cancelDownload"
              >
                取消
              </UButton>
              <UButton
                color="neutral"
                variant="subtle"
                icon="i-lucide-refresh-cw"
                :loading="isCheckingUpdate"
                @click="checkUpdate"
              >
                检查更新
              </UButton>
            </div>

            <!-- 更新信息 -->
            <template v-if="updateInfo">
              <UAlert
                v-if="updateInfo.hasUpdate"
                color="warning"
                variant="subtle"
                icon="i-lucide-arrow-up-circle"
              >
                <template #description>
                  <div class="flex flex-col gap-1 text-sm">
                    <span
                      >发现新版本
                      <strong>{{ updateInfo.latestBuildId }}</strong></span
                    >
                    <span
                      v-if="updateInfo.currentBuildId"
                      class="text-muted text-xs"
                    >
                      当前版本：{{ updateInfo.currentBuildId }}
                    </span>
                  </div>
                </template>
              </UAlert>
              <UAlert
                v-else
                color="success"
                variant="subtle"
                icon="i-lucide-check-circle"
              >
                <template #description>
                  <span class="text-sm">
                    已是最新版本
                    <strong>{{ updateInfo.latestBuildId }}</strong>
                  </span>
                </template>
              </UAlert>
            </template>
          </div>
        </template>
      </UPageCard>
    </template>

    <!-- 自定义路径模式 -->
    <template v-if="mode === 'custom'">
      <UPageCard
        icon="i-lucide-folder-open"
        title="手动指定浏览器路径"
        variant="outline"
      >
        <template #description>
          <span class="text-muted text-sm">
            填写系统中已安装的 Chromium / Chrome 可执行文件的绝对路径。
            留空将使用自动检测。
          </span>
        </template>
        <template #footer>
          <div class="flex w-full flex-col gap-4">
            <UFormField label="可执行文件路径">
              <div class="flex w-full gap-2">
                <UInput
                  v-model="customPath"
                  placeholder="例如：/usr/bin/chromium-browser"
                  class="flex-1"
                  icon="i-lucide-file-cog"
                />
              </div>
            </UFormField>
            <div class="flex gap-2">
              <UButton
                icon="i-lucide-save"
                :loading="isSavingPath"
                @click="saveCustomPath"
              >
                保存路径
              </UButton>
              <UButton
                v-if="currentConfig.executablePath"
                color="error"
                variant="subtle"
                icon="i-lucide-trash-2"
                :loading="isSavingPath"
                @click="clearPath"
              >
                清除
              </UButton>
            </div>
          </div>
        </template>
      </UPageCard>
    </template>
  </div>
</template>
