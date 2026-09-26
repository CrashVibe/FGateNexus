import { useQuery } from "@tanstack/react-query";
import { clamp } from "lodash-es";
import {
  ArrowUpCircle,
  CheckCircle,
  Download,
  FileCog,
  FolderOpen,
  Info,
  RefreshCw,
  Trash2,
  X,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { ACTIVE_STATUSES } from "#shared/model/settings";
import type { DownloadState, DownloadStatus } from "#shared/model/settings";
import { LoadingState } from "@/components/common/loading-state";
import {
  SettingsBlock,
  SettingsRow,
  SettingsSection,
} from "@/components/common/settings-section";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { toast } from "@/components/ui/sonner";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useDownloadStream } from "@/hooks/use-download-stream";
import { t } from "@/i18n";
import { BrowserData } from "@/lib/api";
import { errorMessage } from "@/lib/http";

const IDLE_STATE: DownloadState = {
  buildId: null,
  downloadedBytes: 0,
  platform: null,
  status: "idle",
  totalBytes: 0,
};

const toMB = (b: number): string => (b / 1024 / 1024).toFixed(1);

interface UpdateInfo {
  currentBuildId: string | null;
  hasUpdate: boolean;
  latestBuildId: string;
}

const UpdateInfoAlert = ({ info }: { info: UpdateInfo }) => {
  if (!info.hasUpdate) {
    return (
      <Alert variant="info">
        <CheckCircle />
        <AlertDescription>
          {t("已是最新版本")} <strong>{info.latestBuildId}</strong>
        </AlertDescription>
      </Alert>
    );
  }
  return (
    <Alert variant="warning">
      <ArrowUpCircle />
      <AlertDescription>
        <div className="flex flex-col gap-1 text-sm">
          <span>
            {t("发现新版本")} <strong>{info.latestBuildId}</strong>
          </span>
          {info.currentBuildId ? (
            <span className="text-muted-foreground text-xs">
              {t("当前版本：")}
              {info.currentBuildId}
            </span>
          ) : null}
        </div>
      </AlertDescription>
    </Alert>
  );
};

export const BrowserContent = () => {
  const [mode, setMode] = useState<"download" | "custom">("download");
  const [downloadState, setDownloadState] = useState<DownloadState>(IDLE_STATE);
  const [customPath, setCustomPath] = useState("");
  const [savingPath, setSavingPath] = useState(false);
  const [startingDownload, setStartingDownload] = useState(false);
  const [checkingUpdate, setCheckingUpdate] = useState(false);
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null);
  const [concurrency, setConcurrency] = useState("");

  const {
    data: config,
    isLoading: configLoading,
    refetch: refetchConfig,
  } = useQuery({
    queryFn: async () => await BrowserData.get(),
    queryKey: ["browser-config"],
  });

  useEffect(() => {
    if (config) {
      setConcurrency(String(config.maxConcurrentRenders));
    }
  }, [config]);

  const isDownloading = ACTIVE_STATUSES.has(downloadState.status);
  const downloadProgress = downloadState.totalBytes
    ? clamp(
        Math.round(
          (downloadState.downloadedBytes / downloadState.totalBytes) * 100,
        ),
        0,
        100,
      )
    : 0;

  // 进度状态切换提示（active → done/error）。
  const prevStatus = useRef<DownloadStatus>("idle");
  useEffect(() => {
    const wasActive = ACTIVE_STATUSES.has(prevStatus.current);
    prevStatus.current = downloadState.status;
    if (!wasActive) {
      return;
    }
    if (downloadState.status === "done") {
      toast.success(t("Chrome Headless Shell 下载完成"), {
        description: t("已安装到：{{v0}}", {
          v0: downloadState.executablePath ?? "",
        }),
      });
      void refetchConfig();
    } else if (downloadState.status === "error") {
      toast.error(t("下载失败"), { description: downloadState.error });
    }
  }, [downloadState, refetchConfig]);

  useDownloadStream(true, setDownloadState);

  const downloadStatusText = ((): string => {
    const { status, downloadedBytes, totalBytes } = downloadState;
    if (status === "downloading") {
      return totalBytes > 0
        ? t("下载中 {{v0}} / {{v1}} MB ({{downloadProgress}}%)", {
            downloadProgress,
            v0: toMB(downloadedBytes),
            v1: toMB(totalBytes),
          })
        : t("下载中...");
    }
    if (status === "error") {
      return t("下载失败：{{v0}}", {
        v0: downloadState.error ?? t("未知错误"),
      });
    }
    const map: Partial<Record<DownloadStatus, string>> = {
      done: t("下载完成！"),
      idle: t("等待下载"),
      resolving: t("正在获取最新版本信息..."),
      unpacking: t("正在解压安装..."),
    };
    return map[status] ?? "";
  })();

  const showProgress =
    isDownloading ||
    downloadState.status === "done" ||
    downloadState.status === "error";

  const startDownload = async (): Promise<void> => {
    setStartingDownload(true);
    try {
      await BrowserData.startDownload();
      setDownloadState({ ...IDLE_STATE, status: "resolving" });
    } catch (error) {
      toast.error(t("启动下载失败"), { description: errorMessage(error) });
    } finally {
      setStartingDownload(false);
    }
  };

  const cancelDownload = async (): Promise<void> => {
    try {
      await BrowserData.cancelDownload();
      setDownloadState(IDLE_STATE);
      toast(t("下载已取消"));
    } catch {
      toast.error(t("取消失败"));
    }
  };

  const saveCustomPath = async (): Promise<void> => {
    await BrowserData.patch({ executablePath: customPath.trim() });
    await refetchConfig();
  };

  const clearPath = async (): Promise<void> => {
    setSavingPath(true);
    try {
      await BrowserData.patch({ executablePath: null });
      setCustomPath("");
      toast.success(t("已清除自定义路径，将使用自动检测"));
      await refetchConfig();
    } catch {
      toast.error(t("操作失败"));
    } finally {
      setSavingPath(false);
    }
  };

  const saveConcurrency = async (): Promise<void> => {
    const value = Number(concurrency);
    if (!Number.isInteger(value) || value < 1) {
      throw new Error(t("并发数须为正整数"));
    }
    await BrowserData.patch({ maxConcurrentRenders: value });
    await refetchConfig();
  };

  const checkUpdate = async (): Promise<void> => {
    setCheckingUpdate(true);
    try {
      setUpdateInfo((await BrowserData.checkUpdate()) ?? null);
    } catch {
      toast.error(t("检查更新失败"));
    } finally {
      setCheckingUpdate(false);
    }
  };

  const modeSwitch = (
    <Tabs
      onValueChange={(v) => {
        setMode(v as "custom" | "download");
      }}
      value={mode}
    >
      <TabsList>
        <TabsTrigger value="download">
          <Download className="size-4" />
          {t("自动下载")}
        </TabsTrigger>
        <TabsTrigger value="custom">
          <FolderOpen className="size-4" />
          {t("手动指定路径")}
        </TabsTrigger>
      </TabsList>
    </Tabs>
  );

  return (
    <>
      {configLoading ? (
        <LoadingState />
      ) : (
        <>
          <SettingsSection
            description={t(
              "图片渲染功能需要浏览器支持（chrome-headless-shell）",
            )}
            save={{
              dirty:
                config !== undefined &&
                concurrency !== String(config.maxConcurrentRenders),
              onSave: saveConcurrency,
            }}
            title={
              <span className="inline-flex items-center gap-2">
                {t("浏览器")}
                {config?.executablePath ? (
                  <Badge variant="success">{t("已配置")}</Badge>
                ) : (
                  <Badge variant="warning">{t("未配置")}</Badge>
                )}
              </span>
            }
          >
            {config?.executablePath ? (
              <SettingsBlock>
                <div className="bg-muted/30 flex items-start gap-2 overflow-hidden rounded-md px-3 py-2 font-mono text-sm">
                  <FileCog className="text-muted-foreground mt-0.5 size-4 shrink-0" />
                  <span className="text-muted-foreground min-w-0 break-all">
                    {config.executablePath}
                  </span>
                </div>
              </SettingsBlock>
            ) : (
              <SettingsBlock>
                <Alert variant="info">
                  <Info />
                  <AlertDescription>
                    {t(
                      "未设置自定义路径。系统将自动检测已下载的 Chromium，或你可以在下方下载/设置。",
                    )}
                  </AlertDescription>
                </Alert>
              </SettingsBlock>
            )}

            <SettingsRow
              description={t(
                "同时进行的图片渲染任务数上限，超出的任务会排队等待",
              )}
              label={t("渲染并发数")}
            >
              <Input
                className="w-full text-right sm:w-28"
                id="maxConcurrentRenders"
                min={1}
                onChange={(e) => {
                  setConcurrency(e.target.value);
                }}
                type="number"
                value={concurrency}
              />
            </SettingsRow>
          </SettingsSection>

          {mode === "download" ? (
            <SettingsSection
              description={t(
                "自动下载适合当前系统的 Chrome Headless Shell，并保存至 ./data/browsers/",
              )}
              actions={modeSwitch}
              title={t("下载 Chrome Headless Shell")}
            >
              <SettingsBlock>
                <div className="flex flex-col gap-4">
                  {showProgress ? (
                    <div className="flex flex-col gap-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">
                          {downloadStatusText}
                        </span>
                        {downloadState.status === "downloading" &&
                        downloadState.totalBytes > 0 ? (
                          <span className="text-muted-foreground font-mono text-xs">
                            {downloadProgress}%
                          </span>
                        ) : null}
                      </div>
                      <Progress
                        value={
                          downloadState.status === "unpacking"
                            ? undefined
                            : downloadProgress
                        }
                      />
                      {downloadState.buildId ? (
                        <div className="text-muted-foreground flex gap-4 text-xs">
                          <span>
                            {t("版本：")}
                            {downloadState.buildId}
                          </span>
                          <span>
                            {t("平台：")}
                            {downloadState.platform}
                          </span>
                        </div>
                      ) : null}
                    </div>
                  ) : (
                    <p className="text-muted-foreground text-sm">
                      {t(
                        "将自动选择适合当前系统的版本下载并安装，速度取决于网络环境。",
                      )}
                    </p>
                  )}

                  <div className="flex flex-wrap gap-2">
                    {isDownloading ? (
                      <Button
                        onClick={() => {
                          void cancelDownload();
                        }}
                        variant="destructive"
                      >
                        <X />
                        {t("取消")}
                      </Button>
                    ) : (
                      <Button
                        loading={startingDownload}
                        onClick={() => {
                          void startDownload();
                        }}
                      >
                        <Download />
                        {downloadState.executablePath === undefined
                          ? t("开始下载")
                          : t("重新下载")}
                      </Button>
                    )}
                    <Button
                      disabled={isDownloading}
                      loading={checkingUpdate}
                      onClick={() => {
                        void checkUpdate();
                      }}
                      variant="secondary"
                    >
                      <RefreshCw />
                      {t("检查更新")}
                    </Button>
                  </div>

                  {updateInfo ? <UpdateInfoAlert info={updateInfo} /> : null}
                </div>
              </SettingsBlock>
            </SettingsSection>
          ) : (
            <SettingsSection
              description={t(
                "填写系统中已安装的 Chrome Headless Shell 或 Chromium 可执行文件的绝对路径",
              )}
              save={{
                dirty:
                  customPath.trim() !== "" &&
                  customPath.trim() !== (config?.executablePath ?? ""),
                onSave: saveCustomPath,
              }}
              actions={modeSwitch}
              title={t("手动指定浏览器路径")}
            >
              <SettingsBlock>
                <div className="flex flex-col gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="customPath">{t("可执行文件路径")}</Label>
                    <Input
                      id="customPath"
                      onChange={(e) => {
                        setCustomPath(e.target.value);
                      }}
                      placeholder={t("例如：/usr/bin/chrome-headless-shell")}
                      value={customPath}
                    />
                  </div>
                  <div className="flex gap-2">
                    {config?.executablePath ? (
                      <Button
                        loading={savingPath}
                        onClick={() => {
                          void clearPath();
                        }}
                        variant="destructive"
                      >
                        <Trash2 />
                        {t("清除")}
                      </Button>
                    ) : null}
                  </div>
                </div>
              </SettingsBlock>
            </SettingsSection>
          )}
        </>
      )}
    </>
  );
};
