import { imageRenderer } from "~~/server/service/imgae-renderer";
import {
  parseMinecraftText,
  segmentsToHtml,
} from "~~/shared/utils/minecraft-format";

/**
 * 将含 Minecraft 颜色代码的文本渲染为 PNG Buffer
 */
export const renderMinecraftTextToImage = async (
  text: string,
): Promise<Buffer> => {
  const segments = parseMinecraftText(text, true);
  const bodyHtml = segmentsToHtml(segments);

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8"/>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    background: #1a1a1a;
    padding: 12px 16px;
    display: inline-block;
    max-width: 600px;
    font-family: "Noto Sans Mono", "Consolas", "Courier New", monospace;
    font-size: 16px;
    line-height: 1.6;
    white-space: pre-wrap;
    word-break: break-all;
  }
</style>
</head>
<body>${bodyHtml}</body>
</html>`;

  return imageRenderer.render_html(html, process.cwd(), "auto");
};
