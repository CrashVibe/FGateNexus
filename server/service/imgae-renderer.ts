import { launch } from "puppeteer-core";
import type {
  Browser,
  PuppeteerLifeCycleEvent,
  ScreenshotOptions,
} from "puppeteer-core";

import { getLatestInstalledChromiumPath } from "./browser-downloader";

/**
 * 渲染选项
 */
export interface RenderOptions {
  /**
   * 等待时间
   */
  wait_time: number;
  /**
   * 等待条件
   */
  waitUntil: PuppeteerLifeCycleEvent | PuppeteerLifeCycleEvent[];
  /**
   * 类型
   */
  type: ScreenshotOptions["type"];
  /**
   * 质量
   */
  quality?: ScreenshotOptions["quality"];
}

/**
 * 默认渲染选项
 */
const DEFAULT_RENDER_OPTIONS: RenderOptions = {
  type: "png",
  waitUntil: "domcontentloaded",
  wait_time: 1000,
};

/**
 * 图片渲染服务
 */
class ImageRenderer {
  private browser: Browser | null = null;

  async start() {
    if (this.browser) {
      logger.warn("浏览器已启动，正在重置...");
      await this.stop();
    }
    logger.info("正在启动浏览器服务...");

    let { executablePath } = configManager.config.browser;

    // 如果未配置路径，自动检测已下载的 Chromium
    if (executablePath === undefined) {
      logger.info("未配置浏览器路径，尝试自动检测已下载的 Chromium...");
      executablePath = await getLatestInstalledChromiumPath();
      if (executablePath !== undefined) {
        logger.info(`自动检测到 Chromium 路径：${executablePath}`);
      }
    }

    if (executablePath === undefined) {
      throw new Error(
        "浏览器可执行文件路径未配置，请在设置中下载或指定 Chromium 路径",
      );
    }
    this.browser = await launch({
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
      executablePath,
      headless: true,
    });
  }

  async stop() {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }

  /**
   * 渲染 html 内容
   */
  async render_html(
    html_str: string,
    baseURL: string,
    viewport: { width: number; height: number } | "auto",
    render_options: RenderOptions = DEFAULT_RENDER_OPTIONS,
  ): Promise<Buffer> {
    if (!this.browser) {
      throw new Error("浏览器未启动，请先调用 start() 方法启动浏览器");
    }
    const page = await this.browser.newPage();
    await page.goto(`file://${baseURL}`);
    await page.setContent(html_str, {
      timeout: render_options.wait_time,
      waitUntil: render_options.waitUntil,
    });
    const bodyElement = await page.$("body");
    const bodyBox = bodyElement ? await bodyElement.boundingBox() : null;
    if (viewport === "auto") {
      if (!bodyBox) {
        throw new Error("无法获取页面内容的尺寸");
      }
      await page.setViewport({
        height: Math.ceil(bodyBox.height),
        width: Math.ceil(bodyBox.width),
      });
    } else {
      await page.setViewport({
        height: viewport.height,
        width: viewport.width,
      });
    }
    const screenshotBuffer = await page.screenshot({
      fullPage: true,
      quality: render_options.quality,
      type: render_options.type,
    });
    await page.close();
    return Buffer.from(screenshotBuffer);
  }
}

export const imageRenderer = new ImageRenderer();
