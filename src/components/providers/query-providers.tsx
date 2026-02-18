"use client"

import {QueryClient , QueryClientProvider} from "@tanstack/react-query";
import { useState } from "react";

export function QueryProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [Client] = useState(() => new QueryClient());

    return (
        <QueryClientProvider client={Client}>
            {children}
        </QueryClientProvider>
    )
}