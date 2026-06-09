import type { KnipConfig } from "knip";

const config: KnipConfig = {
  ignoreExportsUsedInFile: true,
  workspaces: {
    ".": {
      entry: ["scripts/**/*.ts"],
      ignoreDependencies: [
        "shadcn", // CLI，通过 bunx 调用，不直接 import
      ],
      project: ["scripts/**/*.ts"],
    },
    "apps/server": {
      entry: ["scripts/*.ts"],
      ignore: ["dist/**"],
      ignoreDependencies: [
        // 通过 tsconfig paths (#shared) 访问，不直接 import 包名
        "@fgate/shared",
      ],
      project: ["src/**/*.ts", "scripts/**/*.ts"],
    },
    "apps/web": {
      // shadcn/ui 组件库文件：按惯例导出所有 Radix 变体，整体排除
      ignore: ["src/components/ui/**"],
      ignoreDependencies: [
        // 通过 tsconfig paths (#shared) 访问，不直接 import 包名
        "@fgate/shared",
        // CSS 工具链，通过 @import 引用，不经过 JS 模块图
        "tailwindcss",
        "tw-animate-css",
      ],
      project: ["src/**/*.{ts,tsx}"],
    },
    "packages/shared": {
      project: ["**/*.ts"],
    },
  },
};

export default config;
