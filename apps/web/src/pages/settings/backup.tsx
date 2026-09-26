import { Download, Upload } from "lucide-react";
import { useRef, useState } from "react";

import { ConfirmDialog } from "@/components/common/confirm-dialog";
import {
  SettingsRow,
  SettingsSection,
} from "@/components/common/settings-section";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/sonner";
import { t } from "@/i18n";
import { errorMessage, uploadFile } from "@/lib/http";

export const BackupContent = () => {
  const input = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);

  const restore = async (): Promise<void> => {
    if (!file) {
      return;
    }
    try {
      await uploadFile("/api/settings/restore", file);
      toast.success(t("备份收下了，重启 FGate 后生效～"));
    } catch (error) {
      toast.error(t("恢复失败"), { description: errorMessage(error) });
      throw error;
    }
  };

  return (
    <SettingsSection
      description={t(
        "数据库、图片模板和配置文件打成一个包；不含已下载的浏览器",
      )}
      title={t("备份与恢复")}
    >
      <SettingsRow description={t("下载当前全部数据")} label={t("备份")}>
        <Button asChild size="sm" variant="outline">
          <a download href="/api/settings/backup">
            <Download />
            {t("下载备份")}
          </a>
        </Button>
      </SettingsRow>
      <SettingsRow
        description={t(
          "上传之前下载的备份包，重启后覆盖现有数据（旧库会留一份 .bak）",
        )}
        label={t("恢复")}
      >
        <input
          accept=".tar.gz,.tgz,application/gzip"
          className="hidden"
          onChange={(e) => {
            setFile(e.target.files?.[0] ?? null);
            e.target.value = "";
          }}
          ref={input}
          type="file"
        />
        <Button
          onClick={() => {
            input.current?.click();
          }}
          size="sm"
          variant="outline"
        >
          <Upload />
          {t("上传备份")}
        </Button>
      </SettingsRow>

      <ConfirmDialog
        confirmText={t("就用这个")}
        description={t(
          "用「{{v0}}」覆盖现在的全部数据？重启后生效，现在的数据库会被改名留作 .bak。",
          { v0: file?.name ?? "" },
        )}
        onConfirm={restore}
        onOpenChange={(open) => {
          if (!open) {
            setFile(null);
          }
        }}
        open={file !== null}
        title={t("从备份恢复")}
      />
    </SettingsSection>
  );
};
