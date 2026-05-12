"use client";

import { useState } from "react";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "sonner";

import { UnsavedChangesGuardProvider } from "~/components/layout/UnsavedChangesGuard";
import { FilterPanelProvider } from "~/contexts/FilterPanelContext";

type Props = {
  children: React.ReactNode;
};

export default function Providers({ children }: Props) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000,
          },
        },
      }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      <FilterPanelProvider>
        <UnsavedChangesGuardProvider>{children}</UnsavedChangesGuardProvider>
      </FilterPanelProvider>
      <Toaster richColors position="top-right" />
    </QueryClientProvider>
  );
}
