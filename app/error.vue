<template>
  <div class="error-page">
    <canvas ref="canvasRef" class="background-canvas" />

    <div
      class="z-10 flex flex-col items-center justify-center space-y-6 rounded-2xl bg-white/10 p-10 shadow-xl backdrop-blur-sm dark:bg-black/10"
    >
      <h1 class="text-6xl font-bold text-gray-900 dark:text-gray-100">404</h1>
      <h2 class="text-2xl font-semibold text-gray-800 dark:text-gray-200">
        资源不存在
      </h2>
      <p class="max-w-md text-center text-gray-600 dark:text-gray-400">
        这里！什么也没有...一片虚无，去别处转转吧
      </p>

      <div class="flex items-center space-x-4 pt-4">
        <UButton
          :loading="navigating"
          color="primary"
          icon="i-heroicons-home"
          size="xl"
          variant="solid"
          @click="handleGoHome"
        >
          返回首页
        </UButton>

        <UButton
          color="neutral"
          icon="i-heroicons-arrow-left"
          size="xl"
          variant="ghost"
          @click="handleGoBack"
        >
          返回上一页
        </UButton>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch, nextTick } from "vue";

const navigating = ref(false);
const canvasRef = ref<HTMLCanvasElement | null>(null);

const colorMode = useColorMode();
const isDark = ref(colorMode.value === "dark");

watch(colorMode, async (mode) => {
  await nextTick();
  isDark.value = mode.value === "dark";
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
  title: "404 - 页面未找到 | FGate",
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
  if (!canvas) {
    return;
  }

  const ctx = canvas.getContext("2d");
  if (!ctx) {
    return;
  }

  const getParticleColor = () => (isDark.value ? "#18a058" : "#36ad6a");

  const resizeCanvas = () => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  };

  resizeCanvas();
  window.addEventListener("resize", resizeCanvas);

  const createParticles = () => {
    particles.length = 0;
    const particleCount = Math.min(
      50,
      Math.floor((canvas.width * canvas.height) / 15_000),
    );

    for (let i = 0; i < particleCount; i += 1) {
      particles.push({
        color: getParticleColor(),
        opacity: Math.random() * 0.5 + 0.1,
        size: Math.random() * 3 + 1,
        vx: (Math.random() - 0.5) * 0.5,
        vy: (Math.random() - 0.5) * 0.5,
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
      });
    }
  };

  createParticles();

  const animate = () => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    for (const [index, particle] of particles.entries()) {
      particle.x += particle.vx;
      particle.y += particle.vy;

      if (particle.x < 0 || particle.x > canvas.width) {
        particle.vx *= -1;
      }
      if (particle.y < 0 || particle.y > canvas.height) {
        particle.vy *= -1;
      }

      particle.x = Math.max(0, Math.min(canvas.width, particle.x));
      particle.y = Math.max(0, Math.min(canvas.height, particle.y));

      ctx.save();
      ctx.globalAlpha = particle.opacity;
      ctx.fillStyle = particle.color;
      ctx.beginPath();
      ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      for (const [otherIndex, otherParticle] of particles.entries()) {
        if (index >= otherIndex) {
          continue;
        }

        const distance = Math.hypot(
          particle.x - otherParticle.x,
          particle.y - otherParticle.y,
        );

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
      }
    }

    animationId = requestAnimationFrame(animate);
  };

  animate();

  watch(isDark, () => {
    for (const particle of particles) {
      particle.color = getParticleColor();
    }
  });

  return () => {
    if (animationId) {
      cancelAnimationFrame(animationId);
    }
    window.removeEventListener("resize", resizeCanvas);
  };
};

onMounted(() => {
  initCanvas();
});

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
  font-family:
    system-ui,
    -apple-system,
    sans-serif;
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
