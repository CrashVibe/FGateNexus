import fs from "node:fs";
import path from "node:path";

import type { Browser, ScreenshotOptions } from "puppeteer-core";
import { launch } from "puppeteer-core";

import { TEMPLATE_DIR } from "#server/service/template/template-store";
import { configManager } from "#server/utils/config";
import { logger } from "#server/utils/logger";

import { getLatestInstalledChromiumPath } from "./browser-downloader";

/** 记录浏览器 PID，用于清理 bun --watch 重启遗留的进程 */
const BROWSER_PID_FILE = path.resolve(
  process.cwd(),
  "data/image-renderer-browser.pid",
);

const killLeftoverBrowser = async (): Promise<void> => {
  let pidText: string;
  try {
    pidText = await fs.promises.readFile(BROWSER_PID_FILE, "utf-8");
  } catch {
    return;
  }
  const pid = Number(pidText);
  if (!Number.isInteger(pid) || pid <= 0) {
    return;
  }
  try {
    process.kill(pid, "SIGTERM");
    logger.warn(`已清理上次遗留的浏览器进程（pid ${pid}）`);
  } catch {
    // 进程已不存在，忽略
  }
};

/** file:// 下 Chromium 因 CORS 不执行 <script type="module">，故本地起 HTTP 服务 */
const serveTemplateAsset = async (req: Request): Promise<Response> => {
  const { pathname } = new URL(req.url);
  const filePath = path.join(TEMPLATE_DIR, decodeURIComponent(pathname));
  const relative = path.relative(TEMPLATE_DIR, filePath);
  if (relative.startsWith("..")) {
    return new Response("Forbidden", { status: 403 });
  }
  const file = Bun.file(filePath);
  if (!(await file.exists())) {
    return new Response("Not Found", { status: 404 });
  }
  return new Response(file);
};

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
  waitUntil: "load" | "domcontentloaded" | ("load" | "domcontentloaded")[];
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

/** 写入 window.__FGATE_TEMPLATE__ */
export interface TemplateRenderContext {
  data: Record<string, unknown>;
  config: Record<string, unknown>;
  meta: Record<string, unknown>;
}

export interface RenderPageOptions {
  /** 默认 false，沙箱化三方模板代码 */
  allowNetwork?: boolean;
  /** 额外放行的来源（manifest networkPermissions[].origin） */
  allowedOrigins?: string[];
  /** 默认 5000ms，超时按当前状态截图 */
  readyTimeout?: number;
  /** 默认 png */
  type?: ScreenshotOptions["type"];
}

/**
 * 图片渲染服务
 */
class ImageRenderer {
  private browser: Browser | null = null;
  private startPromise: Promise<void> | null = null;
  private staticServer: ReturnType<typeof Bun.serve> | null = null;
  private staticServerOrigin: string | null = null;

  async start() {
    if (this.browser) {
      logger.warn("浏览器已启动，正在重置...");
      await this.stop();
    }
    logger.info("正在启动浏览器服务...");
    await killLeftoverBrowser();

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
    this.browser.on("disconnected", () => {
      logger.warn("浏览器连接已断开");
      this.browser = null;
    });
    const pid = this.browser.process()?.pid;
    if (pid !== undefined) {
      await fs.promises.writeFile(BROWSER_PID_FILE, String(pid));
    }

    if (!this.staticServer) {
      this.staticServer = Bun.serve({
        fetch: serveTemplateAsset,
        hostname: "127.0.0.1",
        port: 0,
      });
      this.staticServerOrigin = `http://127.0.0.1:${this.staticServer.port}`;
    }
  }

  async stop() {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
    await fs.promises.rm(BROWSER_PID_FILE, { force: true });
    if (this.staticServer) {
      await this.staticServer.stop();
      this.staticServer = null;
      this.staticServerOrigin = null;
    }
  }

  /** 断连时自动重启，并发调用共享同一次重启 */
  private async ensureBrowser(): Promise<Browser> {
    if (this.browser?.connected) {
      return this.browser;
    }
    if (!this.startPromise) {
      logger.warn("浏览器未连接，正在尝试重新启动...");
      this.startPromise = this.start();
    }
    try {
      await this.startPromise;
    } finally {
      this.startPromise = null;
    }
    if (!this.browser) {
      throw new Error("浏览器未启动，请先调用 start() 方法启动浏览器");
    }
    return this.browser;
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
    const browser = await this.ensureBrowser();
    const page = await browser.newPage();
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

  /** 默认拦截非本地/data: 请求以沙箱化三方代码 */
  async render_page(
    entryFilePath: string,
    context: TemplateRenderContext,
    viewport: { width: number; height: number } | "auto",
    options: RenderPageOptions = {},
  ): Promise<Buffer> {
    const browser = await this.ensureBrowser();
    const { staticServerOrigin } = this;
    if (!staticServerOrigin) {
      throw new Error("本地静态资源服务未启动");
    }
    const relativePath = path
      .relative(TEMPLATE_DIR, entryFilePath)
      .split(path.sep)
      .join("/");

    const page = await browser.newPage();
    try {
      if (!options.allowNetwork) {
        const allowedOrigins = new Set(options.allowedOrigins);
        await page.setRequestInterception(true);
        page.on("request", (req) => {
          const url = req.url();
          if (url.startsWith("data:")) {
            void req.continue();
            return;
          }
          try {
            const { origin } = new URL(url);
            if (origin === staticServerOrigin || allowedOrigins.has(origin)) {
              void req.continue();
              return;
            }
          } catch {
            // 非法 URL，落入下方拦截
          }
          void req.abort();
        });
      }

      await page.evaluateOnNewDocument(
        (ctx: unknown) => {
          (globalThis as { __FGATE_TEMPLATE__?: unknown }).__FGATE_TEMPLATE__ =
            ctx;
        },
        { ...context, ready: false },
      );

      await page.goto(`${staticServerOrigin}/${relativePath}`, {
        waitUntil: "domcontentloaded",
      });

      try {
        await page.waitForFunction(
          "globalThis.__FGATE_TEMPLATE__ && globalThis.__FGATE_TEMPLATE__.ready === true",
          { timeout: options.readyTimeout ?? 5000 },
        );
      } catch {
        logger.warn("模板未在超时时间内调用 ready()，按当前状态截图");
      }

      if (viewport === "auto") {
        const bodyElement = await page.$("body");
        const bodyBox = bodyElement ? await bodyElement.boundingBox() : null;
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
        type: options.type ?? "png",
      });
      return Buffer.from(screenshotBuffer);
    } finally {
      await page.close();
    }
  }
}

export const imageRenderer = new ImageRenderer();
