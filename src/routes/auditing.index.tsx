import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/auditing/")({
  beforeLoad: () => {
    throw redirect({ to: "/auditing/dashboard" });
  },
});
