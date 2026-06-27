import { QueryClient } from "@tanstack/react-query";
import { createRouter, createHashHistory } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";

export const getRouter = () => {
  const queryClient = new QueryClient();

  // Hash history keeps deep links working inside Capacitor's file:// shell
  // and on static hosts without server-side rewrites.
  const router = createRouter({
    routeTree,
    history: createHashHistory(),
    context: { queryClient },
    scrollRestoration: true,
    defaultPreloadStaleTime: 0,
  });

  return router;
};
