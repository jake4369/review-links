"use client";

import { createContext, useCallback, useContext, useMemo, useRef } from "react";
import type { ReactNode } from "react";

type NavigationGuard = () => boolean;
type NavigationGuardContextValue = {
  registerGuard: (guard: NavigationGuard) => () => void;
  requestLeave: () => boolean;
};

const NavigationGuardContext = createContext<NavigationGuardContextValue | null>(
  null,
);

export function NavigationGuardProvider({ children }: { children: ReactNode }) {
  const guardRef = useRef<NavigationGuard | null>(null);

  const registerGuard = useCallback((guard: NavigationGuard) => {
    guardRef.current = guard;
    return () => {
      // An older editor cleanup must not remove a newer registration.
      if (guardRef.current === guard) guardRef.current = null;
    };
  }, []);

  const requestLeave = useCallback(() => guardRef.current?.() ?? true, []);
  const value = useMemo(
    () => ({ registerGuard, requestLeave }),
    [registerGuard, requestLeave],
  );

  return (
    <NavigationGuardContext.Provider value={value}>
      {children}
    </NavigationGuardContext.Provider>
  );
}

export function useNavigationGuard() {
  const context = useContext(NavigationGuardContext);
  if (!context) {
    throw new Error("useNavigationGuard requires NavigationGuardProvider.");
  }
  return context;
}
