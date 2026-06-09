import * as Sentry from "@sentry/react";
import { QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider } from "@tanstack/react-router";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { ThemeProvider } from "tanstack-theme-kit";

import { queryClient } from "@/lib/query";
import { router } from "@/router";

import "./styles.css";

declare const __SENTRY_RELEASE__: string;

const sentryDsn = import.meta.env.VITE_SENTRY_DSN;
if (sentryDsn) {
  void (async () => {
    try {
      const res = await fetch("/api/settings/sentry");
      if (!res.ok) {
        return;
      }
      const { enabled, instanceId } = (await res.json()) as {
        enabled: boolean | null;
        instanceId: string;
      };
      if (enabled !== true) {
        return;
      }

      Sentry.init({
        attachStacktrace: true,
        dsn: sentryDsn,
        integrations: [
          Sentry.browserTracingIntegration(),
          Sentry.replayIntegration(),
          Sentry.captureConsoleIntegration(),
          Sentry.breadcrumbsIntegration({
            console: true,
            dom: true,
            fetch: true,
            history: true,
            xhr: true,
          }),
          Sentry.httpClientIntegration(),
          Sentry.zodErrorsIntegration(),
        ],
        release: __SENTRY_RELEASE__,
        replaysOnErrorSampleRate: 1,
        replaysSessionSampleRate: 0.5,
        sendDefaultPii: true,
        tracesSampleRate: 1,
      });

      Sentry.setUser({ id: instanceId });
    } catch {
      // Sentry 初始化失败不阻断应用启动
    }
  })();
}

const root = document.querySelector("#root");
if (!root) {
  throw new Error("#root not found");
}

createRoot(root).render(
  <StrictMode>
    <ThemeProvider
      attribute="class"
      defaultTheme="dark"
      storageKey="fgate-theme"
    >
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
      </QueryClientProvider>
    </ThemeProvider>
  </StrictMode>,
);
