"use client"

import {QueryClient , QueryClientProvider} from "@tanstack/react-query";
import { useState } from "react";

export function QueryProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [Client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 1000 * 60 * 5,   // 5 min — data stays fresh, no refetch on navigation
            gcTime: 1000 * 60 * 30,      // 30 min — keep unused data in memory
            retry: 1,
            refetchOnWindowFocus: false,
          },
        },
      })
  );

    return (
        <QueryClientProvider client={Client}>
            {children}
        </QueryClientProvider>
    )
}