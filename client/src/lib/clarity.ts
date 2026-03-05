/**
 * clarity.ts — Microsoft Clarity helpers
 *
 * Provides:
 *  - clarityEvent(name, value?)  → fire a Smart Event (only when consent given)
 *  - clarityConsent()            → called once user accepts cookies; activates Clarity
 *  - clarityOptOut()             → called when user declines; stops Clarity recording
 *  - hasConsent()                → returns current consent state from localStorage
 */

const CONSENT_KEY = "fi_cookie_consent"; // "accepted" | "declined" | undefined

declare global {
  interface Window {
    clarity?: (command: string, ...args: unknown[]) => void;
  }
}

/** Returns true if the user has explicitly accepted cookies */
export function hasConsent(): boolean {
  return localStorage.getItem(CONSENT_KEY) === "accepted";
}

/** Returns true if the user has explicitly declined cookies */
export function hasDeclined(): boolean {
  return localStorage.getItem(CONSENT_KEY) === "declined";
}

/** Returns true if the user has not yet made a choice */
export function isPending(): boolean {
  return localStorage.getItem(CONSENT_KEY) === null;
}

/**
 * Called when user clicks "Accept" on the cookie banner.
 * Persists consent and activates Clarity session recording.
 */
export function clarityConsent(): void {
  localStorage.setItem(CONSENT_KEY, "accepted");
  // Clarity was already injected in index.html but paused via consent mode.
  // Calling clarity("consent") signals that recording can begin.
  if (typeof window.clarity === "function") {
    window.clarity("consent");
  }
}

/**
 * Called when user clicks "Decline" on the cookie banner.
 * Persists the choice and stops Clarity from recording.
 */
export function clarityOptOut(): void {
  localStorage.setItem(CONSENT_KEY, "declined");
  if (typeof window.clarity === "function") {
    window.clarity("stop");
  }
}

/**
 * Fire a Microsoft Clarity Smart Event.
 * Only fires if the user has accepted cookies.
 *
 * @param name   Event name (shown in Clarity dashboard)
 * @param value  Optional string value for segmentation
 */
export function clarityEvent(name: string, value?: string): void {
  if (!hasConsent()) return;
  if (typeof window.clarity !== "function") return;
  if (value !== undefined) {
    window.clarity("set", name, value);
  } else {
    window.clarity("event", name);
  }
}
