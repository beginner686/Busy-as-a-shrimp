"use client";

import { useEffect, useState, type ReactNode } from "react";

export function MswProvider({ children }: { children: ReactNode }) {
  const enabled = process.env.NEXT_PUBLIC_ENABLE_MSW === "1";
  const [ready, setReady] = useState(!enabled);

  useEffect(() => {
    if (!enabled) {
      return;
    }
    void import("../mocks/browser").then(async ({ worker }) => {
      await worker.start({
        onUnhandledRequest: "bypass"
      });
      setReady(true);
    });
  }, [enabled]);

  if (!ready) {
    return null;
  }

  return <>{children}</>;
}
