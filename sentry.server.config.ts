import {
  init,
  getGlobalScope,
  httpIntegration,
  onUncaughtExceptionIntegration,
  onUnhandledRejectionIntegration,
  pinoIntegration,
  zodErrorsIntegration,
} from "@sentry/nuxt";

const {
  public: { sentry },
} = useRuntimeConfig();

const sentryEnabled = process.env.SENTRY_ENABLED === "true";
const sentryInstanceId = process.env.SENTRY_INSTANCE_ID ?? "";

init({
  debug: false,
  dsn: sentry.dsn,
  enableLogs: true,
  enabled: sentry.enabled && sentryEnabled,
  integrations: [
    httpIntegration(),
    pinoIntegration({
      error: {
        levels: ["error", "fatal"],
      },
    }),
    onUncaughtExceptionIntegration(),
    onUnhandledRejectionIntegration(),
    zodErrorsIntegration(),
  ],
  release: sentry.release,
  sendDefaultPii: true,
  tracesSampleRate: 1,
});

getGlobalScope().setUser({
  id: sentryInstanceId,
});
