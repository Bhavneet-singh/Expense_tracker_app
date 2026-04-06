import { createRouter, RouterProvider } from "@tanstack/react-router";
import { useAuthStore } from "./store/authStore";
import { routeTree } from "./routeTree.gen";
import { useEffect } from "react";

const router = createRouter({
  routeTree,
  defaultPreload: "intent",
});

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}

export default function App() {
  const { token, user, getProfile } = useAuthStore();

  useEffect(() => {
    if (token && !user) {
      getProfile();
    }
  }, [token, user, getProfile]);

  return <RouterProvider router={router} />;
}
