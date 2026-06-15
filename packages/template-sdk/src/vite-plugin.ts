import * as path from "node:path";

import type { Plugin } from "vite";

import { generateManifest } from "./gen-manifest.ts";
import type { GenerateManifestOptions } from "./gen-manifest.ts";

export type FgateTemplateManifestOptions = Omit<
  GenerateManifestOptions,
  "outFile"
>;

/** 构建后根据 meta/dataSources/configSchema 生成 manifest.json 写入 dist/，避免与源码维护两份 */
export const fgateTemplateManifest = (
  options: FgateTemplateManifestOptions,
): Plugin => {
  let outDir = "dist";
  let root = process.cwd();

  return {
    apply: "build",
    async closeBundle() {
      await generateManifest({
        ...options,
        outFile: path.resolve(root, outDir, "manifest.json"),
      });
    },
    configResolved(config) {
      ({ root } = config);
      ({ outDir } = config.build);
    },
    name: "fgate-template-manifest",
  };
};
