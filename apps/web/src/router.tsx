import {
  createRootRoute,
  createRoute,
  createRouter,
  lazyRouteComponent,
  Outlet,
  redirect,
} from "@tanstack/react-router";

import { LoadingState } from "@/components/common/loading-state";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Toaster } from "@/components/ui/sonner";
import { useAuthStore } from "@/stores/auth";

const rootRoute = createRootRoute({
  component: () => (
    <>
      <Outlet />
      <Toaster />
    </>
  ),
});

const loginRoute = createRoute({
  component: lazyRouteComponent(
    async () => await import("@/pages/login"),
    "LoginPage",
  ),
  getParentRoute: () => rootRoute,
  path: "/login",
});

const dashboardRoute = createRoute({
  async beforeLoad() {
    if (await useAuthStore.getState().requireAuth()) {
      // oxlint-disable-next-line typescript/only-throw-error - TanStack Router 以抛出 redirect表达跳转，并非错误对象。
      throw redirect({ to: "/login" });
    }
  },
  component: DashboardLayout,
  getParentRoute: () => rootRoute,
  id: "dashboard",
});

const parent = () => dashboardRoute;

const dashRoute = <const TPath extends string>(
  path: TPath,
  component: NonNullable<Parameters<typeof createRoute>[0]["component"]>,
) => createRoute({ component, getParentRoute: parent, path });

// 仅用于旧路径兼容重定向，to 无需强类型校验。
const makeRedirect = (path: string, to: string) =>
  createRoute({
    beforeLoad: () => {
      // oxlint-disable-next-line typescript/only-throw-error
      throw redirect({ replace: true, to });
    },
    component: () => null,
    getParentRoute: parent,
    path,
  });

// 无 $section 时重定向到默认子区块，保留其余参数。
const makeSectionRedirect = (path: string, to: string) =>
  createRoute({
    beforeLoad: ({ params }) => {
      // oxlint-disable-next-line typescript/only-throw-error
      throw redirect({
        params: { ...params, section: "basic" },
        replace: true,
        to,
      });
    },
    component: () => null,
    getParentRoute: parent,
    path,
  });

const indexRoute = dashRoute(
  "/",
  lazyRouteComponent(
    async () => await import("@/pages/dashboard"),
    "DashboardPage",
  ),
);
const serversIndexRoute = dashRoute(
  "/servers",
  lazyRouteComponent(
    async () => await import("@/pages/servers/index"),
    "ServersPage",
  ),
);
const botsRoute = dashRoute(
  "/bots",
  lazyRouteComponent(async () => await import("@/pages/bots"), "BotsPage"),
);
const playersRoute = dashRoute(
  "/players",
  lazyRouteComponent(
    async () => await import("@/pages/players"),
    "PlayersPage",
  ),
);
const settingsRoute = dashRoute(
  "/settings",
  lazyRouteComponent(
    async () => await import("@/pages/settings/index"),
    "SettingsPage",
  ),
);
const templatesRoute = dashRoute(
  "/templates",
  lazyRouteComponent(
    async () => await import("@/pages/templates/index"),
    "TemplatesPage",
  ),
);
const serverGeneralRoute = dashRoute(
  "/servers/$id/general",
  lazyRouteComponent(
    async () => await import("@/pages/servers/general"),
    "ServerGeneralPage",
  ),
);
const serverTargetRoute = dashRoute(
  "/servers/$id/target",
  lazyRouteComponent(
    async () => await import("@/pages/servers/target"),
    "ServerTargetPage",
  ),
);
const serverBindingRoute = dashRoute(
  "/servers/$id/binding/$section",
  lazyRouteComponent(
    async () => await import("@/pages/servers/binding"),
    "ServerBindingPage",
  ),
);
const serverBindingOverviewRoute = makeSectionRedirect(
  "/servers/$id/binding",
  "/servers/$id/binding/$section",
);
const serverCommandRoute = dashRoute(
  "/servers/$id/command",
  lazyRouteComponent(
    async () => await import("@/pages/servers/command"),
    "ServerCommandPage",
  ),
);
const serverMsgbridgeRoute = dashRoute(
  "/servers/$id/msgbridge/$section",
  lazyRouteComponent(
    async () => await import("@/pages/servers/msgbridge"),
    "ServerMsgbridgePage",
  ),
);
const serverMsgbridgeOverviewRoute = makeSectionRedirect(
  "/servers/$id/msgbridge",
  "/servers/$id/msgbridge/$section",
);
const serverNotifyRoute = dashRoute(
  "/servers/$id/notify",
  lazyRouteComponent(
    async () => await import("@/pages/servers/notify"),
    "ServerNotifyPage",
  ),
);
const serverTemplatesRoute = dashRoute(
  "/servers/$id/templates",
  lazyRouteComponent(
    async () => await import("@/pages/servers/templates"),
    "ServerTemplatesPage",
  ),
);
const serverTemplateInstanceRoute = dashRoute(
  "/servers/$id/templates/$instanceId",
  lazyRouteComponent(
    async () => await import("@/pages/servers/template-instance"),
    "ServerTemplateInstancePage",
  ),
);

const settingsSecurityRoute = makeRedirect("/settings/security", "/settings");
const settingsBrowserRoute = makeRedirect("/settings/browser", "/settings");
const serverOverviewRoute = createRoute({
  beforeLoad: ({ params }) => {
    // oxlint-disable-next-line typescript/only-throw-error
    throw redirect({ params, replace: true, to: "/servers/$id/general" });
  },
  component: () => null,
  getParentRoute: parent,
  path: "/servers/$id",
});

const routeTree = rootRoute.addChildren([
  loginRoute,
  dashboardRoute.addChildren([
    indexRoute,
    serversIndexRoute,
    botsRoute,
    playersRoute,
    settingsRoute,
    settingsSecurityRoute,
    settingsBrowserRoute,
    templatesRoute,
    serverOverviewRoute,
    serverGeneralRoute,
    serverTargetRoute,
    serverBindingOverviewRoute,
    serverBindingRoute,
    serverCommandRoute,
    serverMsgbridgeOverviewRoute,
    serverMsgbridgeRoute,
    serverNotifyRoute,
    serverTemplatesRoute,
    serverTemplateInstanceRoute,
  ]),
]);

export const router = createRouter({
  defaultPendingComponent: () => <LoadingState />,
  defaultPreload: "intent",
  routeTree,
});

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}
