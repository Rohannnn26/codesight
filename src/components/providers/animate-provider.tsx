"use client";

import { AnimatePresence } from "framer-motion";
import { usePathname } from "next/navigation";

export function AnimateProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  return (
    <AnimatePresence mode="sync" initial={false}>
      <div key={pathname} className="contents">
        {children}
      </div>
    </AnimatePresence>
  );
}
