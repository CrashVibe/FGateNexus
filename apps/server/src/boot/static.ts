import { logger } from "#server/utils/logger";

/** 给定请求路径返回静态响应；若不是已知资源则回退 index.html(SPA 路由）。 */
export type StaticHandler = (pathname: string) => Response;

/**
 * 加载内联的前端资源并返回静态处理器（仅在单 binary 运行时调用）。
 * `#gen/assets` 由构建脚本生成，把每个产物的内容内联为字符串
 * （文本直存、二进制 base64）；若前端未构建则为空模块，此时返回 null
 * （开发态由 Vite dev server 提供前端，不走这里）。
 */
export const loadStaticHandler = async (): Promise<StaticHandler | null> => {
  const { embeddedAssets, indexHtmlBody } = await import("#gen/assets");

  if (indexHtmlBody === null) {
    logger.warn("未内联任何前端资源(apps/web/dist 为空),跳过静态托管");
    return null;
  }

  const indexResponse = (): Response =>
    new Response(indexHtmlBody, {
      headers: { "content-type": "text/html; charset=utf-8" },
    });

  return (pathname: string): Response => {
    const key = pathname === "/" ? "/index.html" : pathname;
    const asset = embeddedAssets[key];
    if (!asset) {
      // 未知路径 → SPA 前端路由回退。
      return indexResponse();
    }
    const body = asset.base64 ? Buffer.from(asset.body, "base64") : asset.body;
    return new Response(body, { headers: { "content-type": asset.type } });
  };
};
