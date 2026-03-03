/* useMarketData.ts — Margin Sentinel
 * Custom hook that polls live market data from the tRPC backend
 * Refreshes every 60 seconds for the pulse bar, 5 minutes for history
 */
import { trpc } from "@/lib/trpc";

/** Live pulse bar data (Brent, WTI, FBX proxy, Port Congestion) */
export function usePulseBar() {
  return trpc.marketData.pulseBar.useQuery(undefined, {
    refetchInterval: 60_000, // refresh every 60s
    staleTime: 30_000,
    retry: 2,
  });
}

/** 6-month oil price history for the line chart */
export function useOilHistory(months = 6) {
  return trpc.marketData.oilHistory.useQuery(
    { months },
    {
      refetchInterval: 5 * 60_000, // refresh every 5 min
      staleTime: 4 * 60_000,
      retry: 2,
    }
  );
}

/** Current prices for the landing cost calculator */
export function useCurrentPrices() {
  return trpc.marketData.currentPrices.useQuery(undefined, {
    refetchInterval: 2 * 60_000,
    staleTime: 60_000,
    retry: 2,
  });
}
