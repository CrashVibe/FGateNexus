import { useDark } from "@vueuse/core";

const isDark = useDark({
    storageKey: "vueuse-color-scheme",
    selector: "html",
    attribute: "class",
    valueDark: "dark",
    valueLight: "light"
});

// Minecraft颜色代码
const MINECRAFT_COLORS: Record<string, string> = {
    "0": "#000000",
    "1": "#0000AA",
    "2": "#00AA00",
    "3": "#00AAAA",
    "4": "#AA0000",
    "5": "#AA00AA",
    "6": "#FFAA00",
    "7": "#AAAAAA",
    "8": "#555555",
    "9": "#5555FF",
    a: "#55FF55",
    b: "#55FFFF",
    c: "#FF5555",
    d: "#FF55FF",
    e: "#FFFF55",
    f: isDark.value ? "#F0F8FF" : "#808080"
};

// 生成混淆文本
function generateObfuscated(text: string): string {
    const obfuscatedChars = "!@#$%^&*()_+-=[]{}|;:,.<>?~`";
    return text
        .split("")
        .map((char) => (char === " " ? " " : obfuscatedChars[Math.floor(Math.random() * obfuscatedChars.length)]))
        .join("");
}

// 转换Minecraft文本为HTML
function minecraftToHtml(text: string): string {
    if (!text) return "";

    const lines = text.split(/\\n|\n/);

    let html = "";
    let currentStyles: string[] = [];
    let currentColor = isDark.value ? "#F0F8FF" : "#808080";
    let inObfuscated = false;

    const closeSpan = () => {
        html += "</span>";
    };

    const openSpan = () => {
        const styles = [];
        styles.push(`color: ${currentColor}`);
        styles.push(...currentStyles);
        if (inObfuscated) styles.push("font-family: monospace");
        html += `<span class="${inObfuscated ? "minecraft-obfuscated" : ""}" style="${styles.join("; ")}">`;
    };

    openSpan();

    for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
        const line = lines[lineIndex];

        if (lineIndex > 0) {
            html += "<br>";
        }

        if (!line) continue;

        let i = 0;

        while (i < line.length) {
            if ((line[i] === "&" || line[i] === "§") && i + 1 < line.length) {
                const nextChar = line[i + 1];
                if (!nextChar) {
                    html += line[i];
                    i++;
                    continue;
                }
                const code = nextChar.toLowerCase();

                if (code === "#" && i + 7 < line.length) {
                    const hexColor = line.substring(i + 1, i + 8);
                    if (/^#[0-9a-fA-F]{6}$/.test(hexColor)) {
                        closeSpan();
                        currentColor = hexColor;
                        inObfuscated = false;
                        openSpan();
                        i += 8;
                        continue;
                    }
                }

                let handled = true;
                if (code === "r") {
                    closeSpan();
                    currentStyles = [];
                    currentColor = isDark.value ? "#F0F8FF" : "#808080";
                    inObfuscated = false;
                    openSpan();
                } else if (MINECRAFT_COLORS[code]) {
                    closeSpan();
                    currentColor = MINECRAFT_COLORS[code];
                    inObfuscated = false;
                    openSpan();
                } else if (code === "k") {
                    closeSpan();
                    inObfuscated = true;
                    openSpan();
                } else if (code === "l") {
                    closeSpan();
                    if (!currentStyles.includes("font-weight: bold")) {
                        currentStyles.push("font-weight: bold");
                    }
                    openSpan();
                } else if (code === "m") {
                    closeSpan();
                    if (!currentStyles.includes("text-decoration: line-through")) {
                        currentStyles.push("text-decoration: line-through");
                    }
                    openSpan();
                } else if (code === "n") {
                    closeSpan();
                    if (!currentStyles.includes("text-decoration: underline")) {
                        currentStyles.push("text-decoration: underline");
                    }
                    openSpan();
                } else if (code === "o") {
                    closeSpan();
                    if (!currentStyles.includes("font-style: italic")) {
                        currentStyles.push("font-style: italic");
                    }
                    openSpan();
                } else {
                    handled = false;
                }

                if (handled) {
                    i += 2;
                } else {
                    html += line[i];
                    i++;
                }
            } else {
                const char = line[i];
                if (char) {
                    if (inObfuscated && char !== " ") {
                        const obfuscatedChar = generateObfuscated(char);
                        html += `<span class="minecraft-obfuscated-char" data-original="${char}">${obfuscatedChar}</span>`;
                    } else {
                        html += char;
                    }
                }
                i++;
            }
        }
    }

    closeSpan();

    return html;
}

// 动态刷新混淆
let animationFrameId: number | null = null;

function startObfuscatedAnimation() {
    if (animationFrameId !== null) {
        cancelAnimationFrame(animationFrameId);
    }

    const animate = () => {
        const obfuscatedChars = document.querySelectorAll(".minecraft-obfuscated-char");
        obfuscatedChars.forEach((element) => {
            const originalChar = element.getAttribute("data-original");
            if (originalChar && originalChar !== " ") {
                element.textContent = generateObfuscated(originalChar);
            }
        });
        animationFrameId = requestAnimationFrame(animate);
    };

    animationFrameId = requestAnimationFrame(animate);
}

function stopObfuscatedAnimation() {
    if (animationFrameId !== null) {
        cancelAnimationFrame(animationFrameId);
        animationFrameId = null;
    }
}

export function useMinecraftFormat() {
    return {
        minecraftToHtml,
        initObfuscatedAnimation: () => setTimeout(startObfuscatedAnimation, 10),
        stopObfuscatedAnimation
    };
}
