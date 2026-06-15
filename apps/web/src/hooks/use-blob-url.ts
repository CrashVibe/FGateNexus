import { useCallback, useEffect, useRef, useState } from "react";

/** 替换或卸载时自动 revoke 旧 URL */
export const useBlobUrl = (): [string | null, (blob: Blob) => string] => {
  const [url, setUrl] = useState<string | null>(null);
  const urlRef = useRef<string | null>(null);

  const setBlob = useCallback((blob: Blob): string => {
    if (urlRef.current) {
      URL.revokeObjectURL(urlRef.current);
    }
    const next = URL.createObjectURL(blob);
    urlRef.current = next;
    setUrl(next);
    return next;
  }, []);

  useEffect(
    () => () => {
      if (urlRef.current) {
        URL.revokeObjectURL(urlRef.current);
      }
    },
    [],
  );

  return [url, setBlob];
};
