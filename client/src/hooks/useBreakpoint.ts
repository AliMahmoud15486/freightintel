/**
 * useBreakpoint — responsive layout hook
 * Returns the current viewport category and boolean helpers.
 * Breakpoints:
 *   mobile  < 640px
 *   tablet  640px – 1023px
 *   desktop ≥ 1024px
 */
import { useState, useEffect } from "react";

export type Breakpoint = "mobile" | "tablet" | "desktop";

function getBreakpoint(width: number): Breakpoint {
  if (width < 640) return "mobile";
  if (width < 1024) return "tablet";
  return "desktop";
}

export function useBreakpoint() {
  const [bp, setBp] = useState<Breakpoint>(() =>
    getBreakpoint(typeof window !== "undefined" ? window.innerWidth : 1280)
  );

  useEffect(() => {
    const handler = () => setBp(getBreakpoint(window.innerWidth));
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, []);

  return {
    bp,
    isMobile: bp === "mobile",
    isTablet: bp === "tablet",
    isDesktop: bp === "desktop",
    isMobileOrTablet: bp === "mobile" || bp === "tablet",
  };
}
