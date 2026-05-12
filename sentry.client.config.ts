import {
  init,
  replayIntegration,
  getGlobalScope,
  browserTracingIntegration,
  captureConsoleIntegration,
  breadcrumbsIntegration,
  httpClientIntegration,
  zodErrorsIntegration,
  piniaIntegration,
} from "@sentry/nuxt";

const {
  public: {
    sentry: { dsn, enabled, release },
  },
} = useRuntimeConfig();

const initSentry = async () => {
  if (!enabled) {
    return;
  }

  let instanceId = "";
  let sentryEnabled = false;

  try {
    const res = await $fetch<{ enabled: boolean | null; instanceId: string }>(
      "/api/settings/sentry",
    );

    if (res.enabled === true) {
      sentryEnabled = true;
      ({ instanceId } = res);
    }
  } catch {
    return;
  }

  if (!sentryEnabled) {
    return;
  }

  init({
    attachStacktrace: true,
    debug: false,
    dsn,
    enableLogs: true,
    enabled,
    integrations: [
      replayIntegration(),
      browserTracingIntegration(),
      captureConsoleIntegration(),
      breadcrumbsIntegration({
        console: true,
        dom: true,
        fetch: true,
        history: true,
        xhr: true,
      }),
      httpClientIntegration(),
      zodErrorsIntegration(),
      piniaIntegration(usePinia()),
    ],
    release,
    replaysOnErrorSampleRate: 1,
    replaysSessionSampleRate: 0.5,
    sendDefaultPii: true,
    tracesSampleRate: 1,
  });

  getGlobalScope().setUser({
    id: instanceId,
  });
};

void initSentry();
