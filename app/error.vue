<template>
    <n-config-provider :theme="theme">
        <div class="error-page">
            <canvas ref="canvasRef" class="background-canvas" />

            <n-result status="404" title="404 资源不存在" description="这里！什么也没有...一片虚无，去别处转转吧">
                <template #footer>
                    <n-space>
                        <n-button type="primary" ghost size="large" :loading="navigating" @click="handleGoHome">
                            <template #icon>
                                <n-icon :component="HomeOutline" />
                            </template>
                            返回首页
                        </n-button>

                        <n-button size="large" @click="handleGoBack">
                            <template #icon>
                                <n-icon :component="ArrowBackOutline" />
                            </template>
                            返回上一页
                        </n-button>
                    </n-space>
                </template>
            </n-result>
        </div>
    </n-config-provider>
</template>

<script setup lang="ts">
import { ArrowBackOutline, HomeOutline } from "@vicons/ionicons5";
import { useDark } from "@vueuse/core";
import { darkTheme, lightTheme } from "naive-ui";

const navigating = ref(false);
const canvasRef = ref<HTMLCanvasElement | null>(null);

// 主题相关
const isDark = useDark({
    storageKey: "vueuse-color-scheme",
    selector: "html",
    attribute: "class",
    valueDark: "dark",
    valueLight: "light"
});

const theme = computed(() => {
    return isDark.value ? darkTheme : lightTheme;
});

// Canvas 动画相关
interface Particle {
    x: number;
    y: number;
    vx: number;
    vy: number;
    size: number;
    opacity: number;
    color: string;
}

let animationId: number | null = null;
const particles: Particle[] = [];

// 页面标题
useHead({
    title: "404 - 页面未找到 | FGate"
});

// 返回首页
const handleGoHome = async () => {
    navigating.value = true;
    try {
        await navigateTo("/");
    } finally {
        navigating.value = false;
    }
};

// 返回上一页
const handleGoBack = () => {
    if (typeof window !== "undefined" && window.history.length > 1) {
        window.history.back();
    } else {
        navigateTo("/");
    }
};

// 初始化 Canvas 动画
const initCanvas = () => {
    const canvas = canvasRef.value;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // 设置 Canvas 尺寸
    const resizeCanvas = () => {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    };

    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);

    // 创建粒子
    const createParticles = () => {
        particles.length = 0;
        const particleCount = Math.min(50, Math.floor((canvas.width * canvas.height) / 15000));

        for (let i = 0; i < particleCount; i++) {
            particles.push({
                x: Math.random() * canvas.width,
                y: Math.random() * canvas.height,
                vx: (Math.random() - 0.5) * 0.5,
                vy: (Math.random() - 0.5) * 0.5,
                size: Math.random() * 3 + 1,
                opacity: Math.random() * 0.5 + 0.1,
                color: isDark.value ? "#18a058" : "#36ad6a"
            });
        }
    };

    createParticles();

    const animate = () => {
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // 更新和绘制粒子
        particles.forEach((particle, index) => {
            // 更新位置
            particle.x += particle.vx;
            particle.y += particle.vy;

            // 边界检查
            if (particle.x < 0 || particle.x > canvas.width) particle.vx *= -1;
            if (particle.y < 0 || particle.y > canvas.height) particle.vy *= -1;

            // 确保粒子在画布内
            particle.x = Math.max(0, Math.min(canvas.width, particle.x));
            particle.y = Math.max(0, Math.min(canvas.height, particle.y));

            // 绘制粒子
            ctx.save();
            ctx.globalAlpha = particle.opacity;
            ctx.fillStyle = particle.color;
            ctx.beginPath();
            ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();

            // 绘制连线
            particles.forEach((otherParticle, otherIndex) => {
                if (index >= otherIndex) return;

                const dx = particle.x - otherParticle.x;
                const dy = particle.y - otherParticle.y;
                const distance = Math.sqrt(dx * dx + dy * dy);

                if (distance < 100) {
                    ctx.save();
                    ctx.globalAlpha = (1 - distance / 100) * 0.2;
                    ctx.strokeStyle = particle.color;
                    ctx.lineWidth = 1;
                    ctx.beginPath();
                    ctx.moveTo(particle.x, particle.y);
                    ctx.lineTo(otherParticle.x, otherParticle.y);
                    ctx.stroke();
                    ctx.restore();
                }
            });
        });

        animationId = requestAnimationFrame(animate);
    };

    animate();

    // 更新粒子颜色
    watch(
        () => isDark.value,
        () => {
            particles.forEach((particle) => {
                particle.color = isDark.value ? "#18a058" : "#36ad6a";
            });
        }
    );

    // 清理函数
    return () => {
        if (animationId) {
            cancelAnimationFrame(animationId);
        }
        window.removeEventListener("resize", resizeCanvas);
    };
};

// 页面进入动画
onMounted(() => {
    initCanvas();
});

// 清理动画
onUnmounted(() => {
    if (animationId) {
        cancelAnimationFrame(animationId);
    }
});
</script>

<style scoped lang="scss">
.error-page {
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 2rem;
    overflow: hidden;
}

.background-canvas {
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    z-index: 1;
    pointer-events: none;
}
</style>
