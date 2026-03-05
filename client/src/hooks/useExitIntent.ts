/**
 * useExitIntent — detects when the user is about to leave the page.
 *
 * Triggers when:
 *  - Mouse moves above a threshold near the top of the viewport (desktop)
 *  - visibilitychange fires (tab switch / minimise — mobile-friendly fallback)
 *
 * Guards:
 *  - Only fires once per session (sessionStorage key)
 *  - Does not fire within the first `delayMs` milliseconds after mount
 *  - Does not fire again after the user has subscribed (optional `hasSubscribed` flag)
 */
import { useEffect, useRef } from "react";

const SESSION_KEY = "freight_intel_exit_shown";

interface Options {
  /** Callback fired when exit intent is detected */
  onExitIntent: () => void;
  /** Milliseconds after mount before the hook becomes active. Default: 3000 */
  delayMs?: number;
  /** Y-threshold in pixels — trigger when mouse goes above this value. Default: 20 */
  threshold?: number;
  /** If true, the hook is disabled (e.g. user already subscribed) */
  disabled?: boolean;
}

export function useExitIntent({
  onExitIntent,
  delayMs = 3000,
  threshold = 20,
  disabled = false,
}: Options) {
  const readyRef = useRef(false);
  const firedRef = useRef(false);

  useEffect(() => {
    if (disabled) return;

    // Already shown this session
    if (sessionStorage.getItem(SESSION_KEY)) {
      firedRef.current = true;
      return;
    }

    // Arm the hook after delayMs
    const timer = setTimeout(() => {
      readyRef.current = true;
    }, delayMs);

    const fire = () => {
      if (!readyRef.current || firedRef.current) return;
      firedRef.current = true;
      sessionStorage.setItem(SESSION_KEY, "1");
      onExitIntent();
    };

    // Desktop: cursor leaves toward the top of the viewport
    const handleMouseLeave = (e: MouseEvent) => {
      if (e.clientY < threshold) {
        fire();
      }
    };

    // Mobile / tab-switch fallback
    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        fire();
      }
    };

    document.addEventListener("mouseleave", handleMouseLeave);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      clearTimeout(timer);
      document.removeEventListener("mouseleave", handleMouseLeave);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [disabled, delayMs, threshold, onExitIntent]);
}
