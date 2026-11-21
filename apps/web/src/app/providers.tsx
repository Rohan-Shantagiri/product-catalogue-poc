import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { PropsWithChildren } from "react";
import { ApiError } from "../shared/api/api-error";

export function createAppQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60_000,
        refetchOnWindowFocus: false,
        retry: (failureCount, error) =>
          failureCount < 2 &&
          error instanceof ApiError &&
          (error.status === 0 || error.status >= 500),
      },
      mutations: { retry: false },
    },
  });
}

export function AppProviders({
  children,
  queryClient,
}: PropsWithChildren<{ queryClient: QueryClient }>) {
  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}
