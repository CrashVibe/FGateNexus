import packageJson from "~~/package.json";

/** 打印启动横幅。 */
export const printBanner = (): void => {
  const version = packageJson.version || "0.0.0";

  const reset = "\u001B[0m";
  const bold = "\u001B[1m";
  const dim = "\u001B[2m";
  const cyan = "\u001B[36m";
  const green = "\u001B[32m";
  const yellow = "\u001B[33m";
  const white = "\u001B[37m";
  const gray = "\u001B[90m";

  const W = 50;
  const bar = `${gray}${"◇".repeat(W - 4)}${reset}`;

  const row = (label: string, value: string, color: string = white) =>
    `  ${gray}◈${reset} ${dim}${label.padEnd(10)}${reset}  ${color}${value}${reset}`;

  const banner = [
    "",
    `${cyan}${bold}◆  FlowGate Nexus${reset}  ${gray}${"◇".repeat(W - 20)}${reset}`,
    "",
    row("version", `v${version}`, green),
    row("env", process.env.NODE_ENV ?? "development", yellow),
    row("platform", `${process.platform} / ${process.arch}`, white),
    row("pid", String(process.pid), gray),
    "",
    bar,
    "",
  ].join("\n");

  process.stdout.write(`${banner}\n`);
};
