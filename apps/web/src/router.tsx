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
    async () => import("@/pages/login"),
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

const indexRoute = dashRoute(
  "/",
  lazyRouteComponent(
    async () => import("@/pages/servers/index"),
    "ServersPage",
  ),
);
const botsRoute = dashRoute(
  "/bots",
  lazyRouteComponent(async () => import("@/pages/bots"), "BotsPage"),
);
const playersRoute = dashRoute(
  "/players",
  lazyRouteComponent(async () => import("@/pages/players"), "PlayersPage"),
);
const settingsRoute = dashRoute(
  "/settings",
  lazyRouteComponent(
    async () => import("@/pages/settings/index"),
    "SettingsPage",
  ),
);
const templatesRoute = dashRoute(
  "/templates",
  lazyRouteComponent(
    async () => import("@/pages/templates/index"),
    "TemplatesPage",
  ),
);
const serverGeneralRoute = dashRoute(
  "/servers/$id/general",
  lazyRouteComponent(
    async () => import("@/pages/servers/general"),
    "ServerGeneralPage",
  ),
);
const serverTargetRoute = dashRoute(
  "/servers/$id/target",
  lazyRouteComponent(
    async () => import("@/pages/servers/target"),
    "ServerTargetPage",
  ),
);
const serverBindingRoute = dashRoute(
  "/servers/$id/binding",
  lazyRouteComponent(
    async () => import("@/pages/servers/binding"),
    "ServerBindingPage",
  ),
);
const serverCommandRoute = dashRoute(
  "/servers/$id/command",
  lazyRouteComponent(
    async () => import("@/pages/servers/command"),
    "ServerCommandPage",
  ),
);
const serverMsgbridgeRoute = dashRoute(
  "/servers/$id/msgbridge",
  lazyRouteComponent(
    async () => import("@/pages/servers/msgbridge"),
    "ServerMsgbridgePage",
  ),
);
const serverNotifyRoute = dashRoute(
  "/servers/$id/notify",
  lazyRouteComponent(
    async () => import("@/pages/servers/notify"),
    "ServerNotifyPage",
  ),
);
const serverTemplatesRoute = dashRoute(
  "/servers/$id/templates",
  lazyRouteComponent(
    async () => import("@/pages/servers/templates"),
    "ServerTemplatesPage",
  ),
);
const serverTemplateInstanceRoute = dashRoute(
  "/servers/$id/templates/$instanceId",
  lazyRouteComponent(
    async () => import("@/pages/servers/template-instance"),
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
    botsRoute,
    playersRoute,
    settingsRoute,
    settingsSecurityRoute,
    settingsBrowserRoute,
    templatesRoute,
    serverOverviewRoute,
    serverGeneralRoute,
    serverTargetRoute,
    serverBindingRoute,
    serverCommandRoute,
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
