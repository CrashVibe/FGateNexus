import { ImageIcon, Loader2 } from "lucide-react";
import type { ReactNode } from "react";
import { useEffect, useState } from "react";

import type { ConfigValue } from "@/components/template/dynamic-config-form";
import { useBlobUrl } from "@/hooks/use-blob-url";
import { TemplateInstanceData } from "@/lib/api";
import { errorMessage } from "@/lib/http";

interface TemplateLivePreviewProps {
  serverId: number;
  templateId: string;
  config: ConfigValue;
}

const DEBOUNCE_MS = 600;

/** 配置变更后防抖渲染 */
export const TemplateLivePreview = ({
  serverId,
  templateId,
  config,
}: TemplateLivePreviewProps) => {
  const [url, setBlob] = useBlobUrl();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(null);

    const run = async (): Promise<void> => {
      try {
        const blob = await TemplateInstanceData.renderPreview(
          serverId,
          templateId,
          config,
          controller.signal,
        );
        setBlob(blob);
      } catch (error_) {
        if (controller.signal.aborted) {
          return;
        }
        setError(errorMessage(error_));
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    };

    const timer = setTimeout(() => {
      void run();
    }, DEBOUNCE_MS);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [serverId, templateId, config, setBlob]);

  const renderBody = (): ReactNode => {
    if (url) {
      return <img alt="模板预览" className="max-w-full rounded" src={url} />;
    }
    if (error) {
      return (
        <p className="text-muted-foreground text-center text-xs">{error}</p>
      );
    }
    return <ImageIcon className="text-muted-foreground size-8" />;
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium">预览</p>
        {loading ? (
          <Loader2 className="text-muted-foreground size-4 animate-spin" />
        ) : null}
      </div>
      <div className="bg-muted/30 flex min-h-32 items-center justify-center rounded-md border p-3">
        {renderBody()}
      </div>
    </div>
  );
};
