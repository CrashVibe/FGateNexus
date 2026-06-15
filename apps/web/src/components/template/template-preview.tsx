import { ImageIcon, Loader2 } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/sonner";
import { useBlobUrl } from "@/hooks/use-blob-url";
import { TemplateInstanceData } from "@/lib/api";
import { errorMessage } from "@/lib/http";

interface TemplatePreviewProps {
  serverId: number;
  instanceId: string;
}

/** 渲染耗时 1-3s */
export const TemplatePreview = ({
  serverId,
  instanceId,
}: TemplatePreviewProps) => {
  const [url, setBlob] = useBlobUrl();
  const [loading, setLoading] = useState(false);

  const run = async (): Promise<void> => {
    setLoading(true);
    try {
      const blob = await TemplateInstanceData.render(serverId, instanceId);
      setBlob(blob);
    } catch (error) {
      toast.error("渲染失败", { description: errorMessage(error) });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-3">
      <Button
        disabled={loading}
        onClick={() => {
          void run();
        }}
        size="sm"
        variant="outline"
      >
        {loading ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <ImageIcon className="size-4" />
        )}
        立即渲染预览
      </Button>
      {url ? (
        <img
          alt="模板预览"
          className="max-w-full rounded-md border"
          src={url}
        />
      ) : (
        <p className="text-muted-foreground text-xs">
          点击上方按钮渲染当前配置的预览图。
        </p>
      )}
    </div>
  );
};
